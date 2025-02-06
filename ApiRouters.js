require('dotenv').config(); 
const express = require('express');
const app = express();
const router = express.Router();
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 3000; 
const SECRET_KEY = process.env.JWT_SECRET || 'clave_secreta'; 

app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error al conectar a MongoDB', err));

// Middleware de autenticación
function autenticarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Acceso denegado');
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send('Token inválido');
        req.user = user;
        next();
    });
}

// Ruta para registrar un nuevo usuario
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Validar que todos los campos estén presentes
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    try {
        // Verificar si el usuario ya existe
        const users = await obtenerUsuarios();
        const existingUser  = users.find(user => user.email === email);
        if (existingUser ) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser  = { name, email, password: hashedPassword };
        users.push(newUser );
        await guardarUsuarios(users);

        console.log('Usuario guardado en la base de datos', newUser );
        
        // Generar un token de autenticación
        const token = jwt.sign({ email: newUser .email }, SECRET_KEY, { expiresIn: '20min' });
        res.status(201).json({ message: 'Usuario creado con éxito', token });
    } catch (error) {
        console.error('Error al registrar usuario', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Ruta para iniciar sesión
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validar que los campos estén presentes
    if (!email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    try {
        const users = await obtenerUsuarios();
        const user = users.find(user => user.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Generar un token de autenticación
        const token = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: '20min' });
        res.json({ token });
    } catch (error) {
        console.error('Error al iniciar sesión', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Ruta para crear una nueva tarea
router.post('/tareas', autenticarToken, async (req, res) => {
    const nuevaTarea = req.body;

    // Validar que la tarea tenga un título
    if (!nuevaTarea.title) {
        return res.status(400).send('El título de la tarea es obligatorio');
    }

    try {
        const tareas = await obtenerTareas();
        tareas.push(nuevaTarea);
        await guardarTareas(tareas);
        res.status(201).send('Tarea creada');
    } catch (error) {
        console.error('Error al crear tarea', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para obtener todas las tareas
router.get('/tareas', autenticarToken, async (req, res) => {
    try {
        const tareas = await obtenerTareas();
        res.status(200).json(tareas);
    } catch (error) {
        console.error('Error al obtener tareas', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para editar una tarea
router.put('/tareas/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;

    try {
        const tareas = await obtenerTareas();
        const tareaIndex = tareas.findIndex(t => t.id === id);

        if (tareaIndex === -1) {
            return res.status(404).send('Tarea no encontrada');
        }

        // Actualizar la tarea
        tareas[tareaIndex] = { ...tareas[tareaIndex], title, description };
        await guardarTareas(tareas);
        res.send('Tarea actualizada');
    } catch (error) {
        console.error('Error al actualizar tarea', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para eliminar una tarea
router.delete('/tareas/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;

    try {
        const tareas = await obtenerTareas();
        const tareaIndex = tareas.findIndex(t => t.id === id);

        if (tareaIndex === -1) {
            return res.status(404).send('Tarea no encontrada');
        }

        // Eliminar la tarea
        tareas.splice(tareaIndex, 1);
        await guardarTareas(tareas);
        res.send('Tarea eliminada');
    } catch (error) {
        console.error('Error al eliminar tarea', error);
        res.status(500).send('Error del servidor');
    }
});

// Función para obtener tareas desde el archivo JSON
async function obtenerTareas() {
    const data = await fs.readFile('tareas.json', 'utf8');
    return JSON.parse(data);
}

// Función para guardar tareas en el archivo JSON
async function guardarTareas(tareas) {
    await fs.writeFile('tareas.json', JSON.stringify(tareas));
}

// Función para obtener usuarios desde el archivo JSON
async function obtenerUsuarios() {
    const data = await fs.readFile('usuarios.json', 'utf8');
    return JSON.parse(data);
}

// Función para guardar usuarios en el archivo JSON
async function guardarUsuarios(usuarios) {
    await fs.writeFile('usuarios.json', JSON.stringify(usuarios));
}

// Integrar las rutas al servidor
app.use('/api', router);

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
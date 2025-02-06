const express = require('express');
const app = express();
const router = express.Router();
const User = require('../models/User'); // Asegúrate de que este modelo esté definido correctamente
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;

const PORT = 3000;
const SECRET_KEY = 'clave_secreta'; // Cambia esto por una variable de entorno en producción

app.use(express.json());

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
        const existingUser  = await User.findOne({ email });
        if (existingUser ) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser  = new User({ name, email, password: hashedPassword });
        const savedUser  = await newUser .save();

        console.log('Usuario guardado en la base de datos', savedUser );
        res.status(201).json({ message: 'Usuario creado con éxito', user: savedUser  });
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
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '20min' });
        res.json({ token });
    } catch (error) {
        console.error('Error al iniciar sesión', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Ruta para obtener todos los usuarios
router.get('/users', autenticarToken, async (req, res) => {
    try {
        const users = await User.find();
        console.log('Usuarios recuperados', users);
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al recuperar usuarios', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Ruta para editar un usuario
router.put('/users/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body; // Puedes agregar más campos si es necesario

    try {
        const updatedUser  = await User.findByIdAndUpdate(id, { name, email }, { new: true });
        if (!updatedUser ) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario actualizado', user: updatedUser  });
    } catch (error) {
        console.error('Error al actualizar usuario', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Ruta para eliminar un usuario
router.delete('/users/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedUser  = await User.findByIdAndDelete(id);
        if (!deletedUser ) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario eliminado', deletedID: id });
    } catch (error) {
        console.error('Error al eliminar usuario', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Integrar las rutas al servidor
app.use('/api', router);

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

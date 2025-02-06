const express = require('express');
const app = express();
const PORT = 3000;
const fs = require('fs').promises;

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

app.post('/tareas', (req, res) => {
    const nuevaTarea = req.body;
    // LÃ³gica para agregar la tarea al archivo JSON
    res.status(201).send('Tarea creada');
  });
  
async function obtenerTareas() {
    const data = await fs.readFile('tareas.json', 'utf8');
    return JSON.parse(data);
  }
  
  async function guardarTareas(tareas) {
    await fs.writeFile('tareas.json', JSON.stringify(tareas));
  }
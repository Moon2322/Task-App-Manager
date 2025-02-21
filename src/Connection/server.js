import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken'; 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error al conectar a MongoDB:", err));

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    last_login: Date
});
const User = mongoose.model("User", UserSchema);

const TaskSchema = new mongoose.Schema({
    Nametask: String,
    Description: String,
    category: String,
    status: Number,
    deadline: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
  });
  
  const Task = mongoose.model("Task", TaskSchema);

const verifyToken = (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", ""); 
  
    if (!token) {
      return res.status(401).json({ message: "Acceso denegado, token no proporcionado" });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; 
      next(); 
    } catch (error) {
        console.log("Error con el token", error);
      res.status(400).json({ message: "Token inválido o expirado" });
    }
  };
  
  app.get('/protected', verifyToken, (req, res) => {
    res.status(200).json({ message: "Ruta protegida accedida", user: req.user });
  });



app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }
  
    try {
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (isMatch) {
        
        const token = jwt.sign(
          { userId: user._id, username: user.username },
          process.env.JWT_SECRET, 
          { expiresIn: '10m' } 
        );
  
        res.status(200).json({
          message: "Inicio de sesión exitoso",
          token: token, 
          user: { username: user.username, email: user.email }
        });
      } else {
        res.status(400).json({ message: "Contraseña incorrecta" });
      }
    } catch (error) {
        console.log("Error con el login", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });
  

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
  
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10); 
  
      const newUser = new User({ username, email, password: hashedPassword, last_login: new Date() });
      await newUser.save();
      res.status(201).json({ message: "Usuario registrado exitosamente", user: newUser });
    } catch (error) {
        console.log("Error con el register", error)

      res.status(500).json({ error: "Error al registrar usuario" });
    }
  });

  app.post('/tasks', verifyToken, async (req, res) => {
    try {
      const { Nametask, Description, category, status, deadline } = req.body;
  
      if (!Nametask || status === undefined || status === null) {
        return res.status(400).json({ message: 'Nametask y status son campos obligatorios' });
      }
      
  
      const newTask = new Task({
        Nametask,
        Description,
        category,
        status,
        deadline: new Date(deadline), 
        userId: req.user.userId, 
      });
  
      await newTask.save();
  
      res.status(201).json({ message: 'Tarea creada exitosamente', task: newTask });
    } catch (error) {
      console.error('Error al crear la tarea:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });
  
app.get('/tasks', verifyToken, async (req, res) => {
    try {
      const tasks = await Task.find({ userId: req.user.userId });
  
      res.status(200).json(tasks);
    } catch (error) {
      console.error('Error al obtener las tareas:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });


  app.put('/tasks/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;

        if (![0, 1, 2, 3].includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ message: 'Tarea no encontrada' });
        }

        res.status(200).json({ message: 'Estado actualizado', task: updatedTask });
    } catch (error) {
        console.error('Error al actualizar el estado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));

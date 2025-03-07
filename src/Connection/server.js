/* import express from 'express';
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
  Nametask: { type: String, required: true },
  Description: { type: String },
  category: { type: String },
  status: { type: Number, default: 0 }, 
  deadline: { type: Date },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now } 
});
  
  const Task = mongoose.model("Task", TaskSchema);


  const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    createdAt: { type: Date, default: Date.now }
  });
  
  const Group = mongoose.model('Group', GroupSchema);
  

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
          { expiresIn: '30m' } 
        );
  
        res.status(200).json({
          message: "Inicio de sesión exitoso",
          token: token, 
          user: { userId: user._id, username: user.username, email: user.email }
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
      const { Nametask, Description, category, deadline, group, assignedTo } = req.body;
  
      if (!Nametask) {
        return res.status(400).json({ message: 'Nametask es un campo obligatorio' });
      }
  
      if (group) {
        const groupExists = await Group.findById(group);
        if (!groupExists) {
          return res.status(400).json({ message: 'El grupo no existe' });
        }
      }
  
      if (assignedTo && !Array.isArray(assignedTo)) {
        return res.status(400).json({ message: 'assignedTo debe ser un array de emails' });
      }
  
      let assignedUserIds = [];
      if (assignedTo && assignedTo.length > 0) {
        const users = await User.find({ email: { $in: assignedTo } });
  
        if (users.length !== assignedTo.length) {
          const missingEmails = assignedTo.filter(
            (email) => !users.some((user) => user.email === email)
          );
          return res.status(400).json({
            message: 'Uno o más emails no corresponden a usuarios existentes',
            missingEmails,
          });
        }
  
        assignedUserIds = users.map((user) => user._id);
      }
  
      const newTask = new Task({
        Nametask,
        Description,
        category,
        status: 0, 
        deadline: new Date(deadline),
        userId: req.user.userId, 
        group,
        createdBy: req.user.userId, 
        assignedTo: assignedUserIds, 
        createdAt: new Date(), 
      });
  
      await newTask.save();
  
      res.status(201).json({ message: 'Tarea creada exitosamente', task: newTask });
    } catch (error) {
      console.error('Error al crear la tarea:', error);
      res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
  });

  
  app.get('/tasks', verifyToken, async (req, res) => {
    try {
      const userId = req.user.userId;
  
      const userGroups = await Group.find({ members: userId }).select('_id');
      const groupIds = userGroups.map(group => group._id);
  
  
      const tasks = await Task.find({
        $or: [
          { assignedTo: userId },
          { group: { $in: groupIds } }
        ]
      });
  
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


app.post('/groups', verifyToken, async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name || !Array.isArray(members)) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const users = await User.find({ email: { $in: members } });

    if (users.length !== members.length) {
      const missingEmails = members.filter(
        email => !users.some(user => user.email === email)
      );
      return res.status(400).json({ 
        message: 'Uno o más emails no corresponden a usuarios existentes',
        missingEmails
      });
    }

    const memberIds = users.map(user => user._id);

    const newGroup = new Group({
      name,
      description,
      creator: req.user.userId,
      members: memberIds, 
      createdAt: new Date()
    });

    await newGroup.save();

    const populatedGroup = await Group.findById(newGroup._id)
      .populate('creator', 'username email')
      .populate('members', 'username email');

    res.status(201).json({ message: 'Grupo creado con éxito', group: populatedGroup });
  } catch (error) {
    console.error('Error al crear el grupo:', error);
    res.status(500).json({ message: 'Error al crear el grupo', error: error.message });
  }
});


app.get('/user/groups', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId; 

    const groups = await Group.find({
      $or: [
        { creator: userId },
        { members: userId }  
      ]
    })
      .populate('creator', 'username email') 
      .populate('members', 'username email'); 

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error al obtener los grupos:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
});

app.post('/groups/:groupId/add-members', verifyToken, async (req, res) => {
  try {
    const { emails } = req.body;
    const groupId = req.params.groupId;

    const users = await User.find({ email: { $in: emails } });

    if (users.length !== emails.length) {
      const missingEmails = emails.filter(email => !users.some(user => user.email === email));
      return res.status(400).json({ message: 'Algunos emails no existen', missingEmails });
    }

    const userIds = users.map(user => user._id);

    await Group.findByIdAndUpdate(groupId, { $addToSet: { members: { $each: userIds } } });

    res.json({ message: "Miembros agregados exitosamente" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
 */
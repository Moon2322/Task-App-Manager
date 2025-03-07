import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import fs from 'fs';

dotenv.config();

// Cargar el archivo JSON de credenciales
const serviceAccount = JSON.parse(fs.readFileSync('./firebase.credencials.json', 'utf-8'));

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// Middleware para verificar el token JWT
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

// Ruta protegida de ejemplo
app.get('/protected', verifyToken, (req, res) => {
  res.status(200).json({ message: "Ruta protegida accedida", user: req.user });
});

// Ruta de login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Buscar el usuario en Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();

    if (snapshot.empty) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    // Obtener el primer usuario que coincida (asumiendo que los nombres de usuario son únicos)
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Generar token JWT
      const token = jwt.sign(
        { userId: userDoc.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );

      res.status(200).json({
        message: "Inicio de sesión exitoso",
        token: token,
        user: { userId: userDoc.id, username: user.username, email: user.email },
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

  try {
    // Verificar si el usuario ya existe
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();

    if (!snapshot.empty) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear un nuevo usuario en Firestore
    const newUser = {
      username,
      email,
      password: hashedPassword,
      rol: "student", // Campo "rol" con valor por defecto "student"
      last_login: new Date(),
    };

    // Guardar el usuario en Firestore
    const userRef = await usersRef.add(newUser);

    // Respuesta exitosa
    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: { id: userRef.id, ...newUser }, // Incluir el ID generado por Firestore
    });
  } catch (error) {
    console.log("Error con el registro", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

app.get('/tasks', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("Usuario ID:", userId); // Log del ID del usuario

    // Obtener los grupos a los que pertenece el usuario
    const groupsRef = db.collection('groups');
    const userGroupsSnapshot = await groupsRef.where('members', 'array-contains', userId).get();
    console.log("Grupos del usuario:", userGroupsSnapshot.size); // Log del número de grupos

    // Extraer los IDs de los grupos
    const groupIds = [];
    userGroupsSnapshot.forEach((doc) => {
      groupIds.push(doc.id);
    });
    console.log("IDs de los grupos:", groupIds); // Log de los IDs de los grupos

    // Obtener las tareas asignadas directamente al usuario
    const tasksRef = db.collection('tasks');
    const tasksSnapshot = await tasksRef
      .where('assignedTo', 'array-contains', userId)
      .get();
    console.log("Tareas asignadas al usuario:", tasksSnapshot.size); // Log del número de tareas

    // Obtener las tareas asignadas a los grupos del usuario (solo si hay grupos)
    let groupTasksSnapshot;
    if (groupIds.length > 0) {
      groupTasksSnapshot = await tasksRef
        .where('group', 'in', groupIds)
        .get();
      console.log("Tareas asignadas a los grupos:", groupTasksSnapshot.size); // Log del número de tareas
    } else {
      groupTasksSnapshot = { docs: [] }; // Si no hay grupos, no hay tareas
    }

    // Combinar los resultados
    const tasks = [];
    tasksSnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    groupTasksSnapshot.docs.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    // Eliminar duplicados
    const uniqueTasks = [...new Map(tasks.map((task) => [task.id, task])).values()];
    console.log("Tareas únicas:", uniqueTasks.length); // Log del número de tareas únicas

    res.status(200).json(uniqueTasks);
  } catch (error) {
    console.error('Error al obtener las tareas:', error); // Log del error
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/tasks', verifyToken, async (req, res) => {
  try {
    const { Nametask, Description, category, deadline, group, assignedTo } = req.body;

    // Validar campos obligatorios
    if (!Nametask) {
      return res.status(400).json({ message: 'Nametask es un campo obligatorio' });
    }

    // Verificar si el grupo existe (si se proporciona)
    if (group) {
      const groupRef = db.collection('groups').doc(group);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        return res.status(400).json({ message: 'El grupo no existe' });
      }
    }

    // Validar que assignedTo sea un array (si se proporciona)
    if (assignedTo && !Array.isArray(assignedTo)) {
      return res.status(400).json({ message: 'assignedTo debe ser un array de emails' });
    }

    // Obtener los IDs de los usuarios asignados (si se proporciona)
    let assignedUserIds = [];
    if (assignedTo && assignedTo.length > 0) {
      const usersRef = db.collection('users');
      const usersSnapshot = await usersRef.where('email', 'in', assignedTo).get();

      // Verificar que todos los emails correspondan a usuarios existentes
      if (usersSnapshot.size !== assignedTo.length) {
        const existingEmails = usersSnapshot.docs.map((doc) => doc.data().email);
        const missingEmails = assignedTo.filter((email) => !existingEmails.includes(email));

        return res.status(400).json({
          message: 'Uno o más emails no corresponden a usuarios existentes',
          missingEmails,
        });
      }

      // Obtener los IDs de los usuarios
      assignedUserIds = usersSnapshot.docs.map((doc) => doc.id);
    }

    // Crear la nueva tarea
    const newTask = {
      Nametask,
      Description,
      category,
      status: 0, // Estado por defecto
      deadline: new Date(deadline), // Convertir a fecha
      userId: req.user.userId, // ID del usuario que crea la tarea
      group: group || null, // ID del grupo (opcional)
      createdBy: req.user.userId, // ID del usuario que crea la tarea
      assignedTo: assignedUserIds, // IDs de los usuarios asignados
      createdAt: new Date(), // Fecha de creación
    };

    // Guardar la tarea en Firestore
    const taskRef = await db.collection('tasks').add(newTask);

    // Respuesta exitosa
    res.status(201).json({
      message: 'Tarea creada exitosamente',
      task: { id: taskRef.id, ...newTask }, // Incluir el ID generado por Firestore
    });
  } catch (error) {
    console.error('Error al crear la tarea:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
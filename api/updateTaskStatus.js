// api/updateTaskStatus.js
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';

// Cargar las credenciales desde la variable de entorno
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Middleware para verificar el token JWT
const verifyToken = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Acceso denegado, token no proporcionado');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Token inválido o expirado' + error);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Verificar el token JWT (pero no usar el resultado)
    verifyToken(req);

    const { status } = req.body;
    const taskId = req.query.id; // Obtener el ID de la tarea desde la URL

    // Validar el estado
    if (![0, 1, 2, 3].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    // Obtener la referencia a la tarea
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    // Verificar si la tarea existe
    if (!taskDoc.exists) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Actualizar el estado de la tarea
    await taskRef.update({ status });

    // Obtener la tarea actualizada
    const updatedTaskDoc = await taskRef.get();
    const updatedTask = { id: updatedTaskDoc.id, ...updatedTaskDoc.data() };

    // Respuesta exitosa
    return res.status(200).json({ message: 'Estado actualizado', task: updatedTask });
  } catch (error) {
    console.error('Error al actualizar el estado:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}
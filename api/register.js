import bcrypt from 'bcryptjs';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

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
      rol: "student", 
      last_login: new Date(),
    };

    const userRef = await usersRef.add(newUser);

    return res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: { id: userRef.id, ...newUser }, 
    });
  } catch (error) {
    console.log("Error con el registro", error);
    return res.status(500).json({ error: "Error al registrar usuario" });
  }
}
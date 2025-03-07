import api from './api';

export const registerUser = async (email, username, password) => {
    try {
        console.log("Registering service")
    }
}


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


  
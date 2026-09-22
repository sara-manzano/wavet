const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const { connectToDatabase } = require('./config/db');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await connectToDatabase(process.env.MONGODB_URI);

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
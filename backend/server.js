import http from 'http';
import httpServer from 'http-server';

const port = 3000; // You can choose any available port

// Create an HTTP server using http-server
const server = http.createServer(httpServer.create({
  root: './public', // Specify the directory where your project files are located
}));

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

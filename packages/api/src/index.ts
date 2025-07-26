import app from './app';

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 HandoverKey API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth`);
}); 
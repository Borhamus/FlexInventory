import { useRoutes } from 'react-router-dom';
import { routes } from './routes/routes.config';

function App() {
  // useRoutes transforma nuestro array de objetos en componentes de ruta
  const element = useRoutes(routes);

  return (
    <>
      {element}
    </>
  );
}

export default App;
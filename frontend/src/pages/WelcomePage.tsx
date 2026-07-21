import React from 'react';
import { Button, Typography } from 'antd'; 
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.heroContainer}>
      <div style={styles.content}>
        <Title style={styles.title}>
          Bienvenido a FlexInventory
        </Title>
        <Paragraph style={styles.subtitle}>
          Descubre una nueva forma de gestionar tus articulos y optimizar tus recursos.
        </Paragraph>
        <Button 
          type="primary" 
          size="large" 
          style={styles.ctaButton}
          onClick={() => navigate('/registro')} 
          className='boton-latido'
        >
          Comenzar
        </Button>
      </div>
    </div>
  );
};

const styles = {
  heroContainer: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center' as const,
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1652743920822-faaabb728dea?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: '"Elms Sans", sans-serif',
  },
  content: {
    maxWidth: '800px',
    padding: '0 20px',
  },
  title: {
    color: '#ffffff',
    fontSize: '4rem',
    marginBottom: '16px',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#f0f0f0',
    fontSize: '1.5rem',
    marginBottom: '40px',
    fontFamily: '"Elms Sans", sans-serif',
  },
  ctaButton: {
    backgroundColor: '#818896', 
    borderColor: '#818896',
    fontSize: '1.2rem',
    height: '50px',
    padding: '0 40px',
    borderRadius: '4px',
    fontFamily: '"Elms Sans", sans-serif',
  }
};

export default WelcomePage;
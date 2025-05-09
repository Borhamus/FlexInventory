import React from 'react';
import { Skeleton } from 'primereact/skeleton';
import '../styles/Home.css';
import ContadorHome from '../components/ContadorHome';
import Movimiento from '../components/Movimiento';

function Home() {

  // Json que espero recibir, esto es un placeholder
  // Esta es una simulación del "futuro fetch a una API"

  /* 
    Es altamente reutilizable, si el día de mañana se añaden contadores 
    se muestran sin problemas! 
  */
  const apiContadores = [
    {
      id: 1,
      numero: 40,
      titulo: "Articulos Registrados"
    },
    {
      id: 2,
      numero: 40,
      titulo: "Nuevos articulos esta semana"
    },
    {
      id: 3,
      numero: 40,
      titulo: "Articulos sin Stock"
    }
  ];


  return (
      <div className='home' class = "home grid nested-grid">

        <div className="col-9">

          <div class = "grid nested-grid" >

            {/* Linea de contadores */}
            {/* En vez de escribir contador a contador, recorremos la "respuesta" del endpoint, por
            ahora está harcodeado jaja */}

            {/* forEach((contador) -> ContadorHome(contador.numero, contador.titulo)) */}
            {apiContadores.map((contador) => (
              <div className="col" key={contador.id}>
                <ContadorHome numero={contador.numero} titulo={contador.titulo} />
              </div>
            ))}
            
            <div className="col">
                <Movimiento />
            </div>
            
            {/* Linea de movimientos y chart */}
            <div className="col-12">
              <div className="grid">

                <div className="col-4">
                  <Skeleton height="630px"/>
                </div>

                <div className="col-8">
                  <Skeleton height="630px"/>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* columna de movimientos de otros usuarios */}
        <div class="col-3">
          <Skeleton height="830px"/>
        </div>

      </div>
  )
}

export default Home;
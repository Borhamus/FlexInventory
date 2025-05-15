import React from 'react';
import { Skeleton } from 'primereact/skeleton';
import '../styles/Home.css';
import ContadorHome from '../components/ContadorHome';
import Movimiento from '../components/Movimiento';
import UltimosMovimientosHome from '../components/UltimosMovimientosHome';
import UsuariosActivos from '../components/UsuariosActivos';
import Estadisticas from '../components/Estadisticas';

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
      numero: 25,
      titulo: "Articulos Registrados"
    },
    {
      id: 2,
      numero: 7,
      titulo: "Nuevos articulos esta semana"
    },
    {
      id: 3,
      numero: 4,
      titulo: "Articulos sin Stock"
    }
  ];

  return (
    /* grid nested-grid es un tipo de contenedor */
    <div class = "home-body grid nested-grid">

      {/* Columna izquierda - requiere grid ya que tendrá una estructura dentro*/}
      <div class = "left-container col-9">

        {/* Contenedor Izquierdo Superior */}
        <div class = "contadoresHome grid pb-2" >
          {/* forEach((contador) -> ContadorHome(contador.numero, contador.titulo)) */}
          {apiContadores.map((contador) => (
              <div className="col" key={contador.id}>
                <ContadorHome numero={contador.numero} titulo={contador.titulo} />
              </div>
          ))}
        </div>

        {/* Contenedor Izquierdo Inerior*/}
        <div class = "estadisticasHome grid" >
        
          {/* Movimientos del Usuario */}
          <div class = "col-4">
            <UltimosMovimientosHome titulo={"Ultimos Movimientos"} />
          </div>

          {/* Tablas, diagramas, Estadisticas */}
          <div class = "col-8">
            <Estadisticas titulo={"Estadisticas"} />
          </div>
        </div>
      </div>

      {/* Columna Derecha - No requiere grid porque ocupa todo el espacio*/}
      <div class = "right-containerHome col-3" >
        <UsuariosActivos titulo = "Usuarios Activos"/>
      </div>

    </div>
  )
}

export default Home;
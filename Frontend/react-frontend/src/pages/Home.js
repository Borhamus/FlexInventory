import React from 'react';
import { Skeleton } from 'primereact/skeleton';

function Home() {
  return (
      <div className='home' class = "grid nested-grid">

        <div className="col-9">

          <div class = "grid nested-grid">

            <div className="col-4">
              <Skeleton height="180px"/>
            </div>
            <div className="col-4">
              <Skeleton height="180px"/>
            </div>
            <div className="col-4">
              <Skeleton height="180px"/>
            </div>

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

        <div class="col-3">
          <Skeleton height="825px"/>
        </div>

      </div>
  )
}

export default Home;
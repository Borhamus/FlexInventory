import React, { useState } from "react";
import '../styles/Profile2.css';

const Profile2 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div className="profile-container">
      <h2>Perfil de Usuario</h2>
      <p>Este es el perfil del usuario.</p>
      <button onClick={handleOpenModal} className="btn-edit">
        Editar Perfil
      </button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Editar Perfil</h3>
            <form>
              <label>
                Nombre:
                <input type="text" placeholder="Tu nombre" />
              </label>
              <label>
                Email:
                <input type="email" placeholder="Tu email" />
              </label>
              <div className="modal-actions">
                <button type="submit" className="btn-save">
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile2;

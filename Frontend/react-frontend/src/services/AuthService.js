import axios from "./AxiosConfig";

// Este servicio centraliza el consumo de las apis relacionadas con Inventario.
export class AuthService {
    baseUrl = "http://localhost:8080/auth/";

    login(loginForm){
        console.log("Axios loginForm: " + loginForm)
        return axios
                .post(this.baseUrl + "login", loginForm)
                .then((res) => res.data)
                .catch((error) => {
                    console.error("Error al obtener Token:", error);
                    throw error; // Lanza el error para que se pueda manejar en el componente
                });
    }

    register(registerForm){
        return axios
                .post(this.baseUrl + "register", registerForm)
                .then((res) => res.data)
                .catch((error) => {
                    console.error("Error al registrar usuario:", error);
                    throw error; // Lanza el error para que se pueda manejar en el componente
                });
    }
}

export default new AuthService();

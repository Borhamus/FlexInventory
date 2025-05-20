import axios from 'axios';
axios.defaults.headers.common.Authorization = `Bearer ${localStorage.getItem("token")}`;
console.log("Token de axios: " + localStorage.getItem("token"))
export default axios;
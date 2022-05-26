import axios from "../api/axios";
import useAuth from "./useAuth";

const useLogout = () => {
  const { setAuth } = useAuth();

  const logout = async () => {
    setAuth({});
    try {
      const response = await axios.get('/api/logout', {
        withCredentials: true
      });
      if (response.status === 204) {
        console.log(`useLogout: ${response}`);
      }
      console.log('useLogout: No 204');
    } catch (err) {
      console.error(err);
    }
  }

  return logout;
}

export default useLogout;
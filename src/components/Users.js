import { useState, useEffect } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const Users = () => {
  const [users, setUsers] = useState();
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const getUsers = async () => {
      try {
        const response = await axiosPrivate.get('/api/users', {
          signal: controller.signal // used to cancel the request
        });
        isMounted && setUsers(response.data);
      } 
      catch (err) {
        // console.log(err);
      }
    }
    getUsers();

    return () => {
      isMounted = false;
      controller.abort();
    }
  }, []);

  return (
    <article>
      <h3>Allowed to see registered email list:</h3>
      {users?.length 
        ? (
            <ul>
              {users.map((user, i) => <li key={i}>{user?.email}</li>)}
            </ul>
        ) : <p>No users to display</p>
      }
    </article>
  );
};

export default Users;
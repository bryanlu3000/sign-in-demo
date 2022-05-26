import './SignIn.css';
import { useState, useRef, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import useLogout from '../hooks/useLogout';
import useRefreshToken from '../hooks/useRefreshToken';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import isEmail from 'validator/lib/isEmail';
import isStrongPassword from 'validator/lib/isStrongPassword';
import Users from './Users';

export default function SignIn() {
  const { setAuth, auth } = useAuth();
  const [inputs, setInputs] = useState({});
  const [errors, setErrors] = useState({}); // Errors from inputs validation
  const [errMsg, setErrMsg] = useState(''); // Errors from the backend
  const [success, setSuccess] = useState(false);
  const emailRef = useRef();
  const refresh = useRefreshToken();
  const LOGIN_URL = '/api/login';

  useEffect(() => {
    // Set the focus on email input when the component loads
    emailRef.current.focus();

    // Async function to refresh JWT accessToken
    const refreshAccessToken = async () => {
      try {
        await refresh();
      }
      catch (err) {
        console.error(err);
      }
    }

    // Everytime this component first loads, if there is no accessToken, try refreshing the accessToken using refreshToken saved in cookie.
    // This will keep logged-in user's accessToken in case of reloading the current page.
    if (!auth?.accessToken) {
      refreshAccessToken();
    }
  }, []);

  // Clear the errMsg once inputs change
  useEffect(() => {
    setErrMsg('');
  }, [inputs]);

  // Enable credentials for all axios cross-site Access-Control requests.
  // Allow to send cookies with axios request.
  // Or put "withCredentials: true" in each axios request.
  axios.defaults.withCredentials = true;

  // Validate email and password inputs
  const validateSignIn = (data) => {
    const err = {};
    if (!data.email) {
      err.email = 'Email required.';
    } else if (!isEmail(data.email)) {
      err.email = 'Please input a valid email.';
    }

    if (!data.password) {
      err.password = 'Password required.';
    } else if (!isStrongPassword(data.password, {
      minLength: 8, 
      minLowercase: 1, 
      minUppercase: 1, 
      minNumbers: 1, 
      minSymbols: 0
    })) {
      err.password = 'Please input a valid password with at least 8 characters, 1 lowercase, 1 uppercase and 1 number.';
    }
    return err;
  }

  const handleChange = (e) => {
    setInputs(prev => ({...prev, [e.target.name]: e.target.value}));
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    const err = validateSignIn(inputs);
    setErrors(err);

    if (Object.keys(err).length === 0) {
      const { email, password } = inputs;
      axios.post(LOGIN_URL, { email, password })
        .then(res => {
          if (res.status === 201) {
            const accessToken = res?.data?.accessToken;
            setAuth({ email, password, accessToken });
            setInputs({});
            setSuccess(true);
          }
          console.log(res.data.message);
          // console.log(`accessToken: ${res.data.accessToken}`);
        })
        .catch(err => {
          if (!err?.response) {
            setErrMsg('No Server Response');
          } else if (err.response?.status === 401) {
            setErrMsg('Unauthorized');
          } else {
            setErrMsg('Login Failed');
          }
        });
    }
  }

  const logout = useLogout();
  const handleLogout = () => {
    logout()
      .then(res => {
        setSuccess(false);
      })
      .catch(err => console.error(err))
  }

  return (
    <div className="full-screen-container">
      {success ? (
        <section className="signin-container">
          <h1>Login Success!</h1>
          <Users />
          <Link to='/' onClick={ handleLogout }>Logout</Link>
        </section>
      ) : (
        <section className="signin-container">
          <p className={errMsg ? "errmsg" : "offscreen"}>{errMsg}</p>
          <h2 className="signin-title">Sign in</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor='email'>Email</label>
              <input 
                type="text" 
                name="email"
                id="email"
                value={inputs.email || ''} 
                ref={emailRef}
                onChange={handleChange} 
                style={errors.email && {borderColor: 'red', outlineColor: 'red'}}
              />
              {errors.email && <p>{errors.email}</p>}
            </div>

            <div className="input-group">
              <label htmlFor='password'>Password</label>
              <input 
                type="password" 
                name="password"
                id="password"
                value={inputs.password || ''} 
                onChange={handleChange} 
                style={errors.password && {borderColor: 'red', outlineColor: 'red'}}
              />
              {errors.password && <p>{errors.password}</p>}
            </div>

            <div className="checkbox-group">
              <input type="checkbox"></input>
              <label>Remember me?</label>
            </div>

            <button type="submit" className="signin-button">Sign in</button>
          </form>

          <div className="signin-footer">
            <a href='#'>Forgot your password?</a>
            <p>Don't have an account? <Link to='/signup'>Sign up</Link></p>
            <a href='#'>Resend email confirmation</a>
          </div>
        </section>
      )}
    </div>
  );
}
import './SignIn.css';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import isEmail from 'validator/lib/isEmail';
import isStrongPassword from 'validator/lib/isStrongPassword';

export default function SignUp() {
  const [inputs, setInputs] = useState({});
  const [errors, setErrors] = useState({}); // Errors from inputs validation
  const [errMsg, setErrMsg] = useState(''); // Errors from the backend
  const [success, setSuccess] = useState(false);
  const emailRef = useRef();
  const REGISTER_URL = '/api/register';

  // Set the focus on email input when the component loads
  useEffect(() => {
    emailRef.current.focus();
  }, []);

  // Clear the errMsg once inputs change
  useEffect(() => {
    setErrMsg('');
  }, [inputs]);

  // Enablel credentials for all axios cross-site Access-Control requests.
  // or put "withCredentials: true" in each axios request.
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
    
    if (!data.matchPassword) {
      err.matchPassword = 'Password required.';
    } else if (data.password !== data.matchPassword) {
      err.matchPassword = 'Passwords are not matched. Please enter the password again.';
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
      const { email, password} = inputs;
      axios.post(REGISTER_URL, { email, password })
        .then(res => {
          if (res.status === 201) {
            setSuccess(true);
          }
          console.log(res.data.messsage);
        })
        .catch(err => {
          if (!err?.response) {
            setErrMsg('No Server Response');
          } else if (err.response?.status === 409) {
            setErrMsg('Email has already existed.');
          } else {
            setErrMsg('Registration Failed');
          }
        });
    }
  }

  return (
    <div className="full-screen-container">
      {success ? (
        <section className="signin-container">
          <h1>Sign Up Success!</h1>
          <Link to='/'>Sign In</Link>
        </section>
      ) : (
        <section className="signin-container">
          <p className={errMsg ? "errmsg" : "offscreen"}>{errMsg}</p>
          <h2 className="signin-title">Sign up</h2>
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

              <label htmlFor='matchPassword' style={{marginTop: '20px'}}>Confirm Password</label>
              <input 
                type="password" 
                name="matchPassword"
                id="matchPassword"
                value={inputs.matchPassword || ''} 
                onChange={handleChange} 
                style={errors.matchPassword && {borderColor: 'red', outlineColor: 'red'}}
              />
              {errors.matchPassword && <p>{errors.matchPassword}</p>}
            </div>

            <button type="submit" className="signin-button">Sign Up</button>
          </form>

          <div className="signin-footer">
            <p>Already registered?</p>
            <Link to='/'>Sign In</Link>
          </div>
        </section>
      )}
    </div>
  );
}
export const auth = {
  get token() { 
    return localStorage.getItem('token'); 
  },
  set token(v: string | null) { 
    if (v) {
      localStorage.setItem('token', v);
    } else {
      localStorage.removeItem('token');
    }
  }
};
import React, { useState, useEffect } from 'react';
import {api } from '../api';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

interface UserCreate {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'user';
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<UserCreate>({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [updateForm, setUpdateForm] = useState<UserUpdate>({});
  const [error, setError] = useState<string>('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/', createForm);
      setCreateForm({ username: '', email: '', password: '', role: 'user' });
      setShowCreateForm(false);
      setError('');
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      setError(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const updateData = { ...updateForm };
      // Remove empty fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof UserUpdate] === '') {
          delete updateData[key as keyof UserUpdate];
        }
      });
      
      await api.put(`/users/${editingUser.id}`, updateData);
      setEditingUser(null);
      setUpdateForm({});
      setError('');
      loadUsers();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      setError(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      setError('');
      loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      setError(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setUpdateForm({
      username: user.username,
      email: user.email,
      role: user.role
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setUpdateForm({});
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2>User Management</h2>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Create User form moved below table */}

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Users</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={updateForm.username || ''}
                          onChange={(e) => setUpdateForm({...updateForm, username: e.target.value})}
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          value={updateForm.email || ''}
                          onChange={(e) => setUpdateForm({...updateForm, email: e.target.value})}
                        />
                      ) : (
                        user.email
                      )}
                    </td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <select
                          className="form-select form-select-sm"
                          value={updateForm.role || ''}
                          onChange={(e) => setUpdateForm({...updateForm, role: e.target.value as 'admin' | 'user'})}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`badge bg-${user.role === 'admin' ? 'danger' : 'primary'}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={updateUser}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => startEdit(user)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => deleteUser(user.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-center mt-3">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create User
            </button>
          </div>

          {showCreateForm && (
            <div className="card mt-3">
              <div className="card-header">
                <h5 className="mb-0">Create New User</h5>
              </div>
              <div className="card-body">
                <form onSubmit={createUser}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        className="form-control"
                        value={createForm.username}
                        onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        value={createForm.role}
                        onChange={(e) => setCreateForm({...createForm, role: e.target.value as 'admin' | 'user'})}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">Create User</button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowCreateForm(false);
                        setCreateForm({ username: '', email: '', password: '', role: 'user' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {users.length === 0 && (
            <div className="text-center text-muted py-4">
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


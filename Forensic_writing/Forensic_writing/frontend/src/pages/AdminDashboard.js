import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import {
    ShieldAlert,
    Users,
    Database,
    Activity,
    Eye,
    Pencil,
    Trash2,
    Plus,
    ChevronLeft,
    ChevronRight,
    X,
    EyeOff,
    AlertTriangle,
    Phone
} from 'lucide-react';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';

import LoadingSpinner from '../components/UI/LoadingSpinner';

const AdminDashboard = () => {
    const queryClient = useQueryClient();

    const [selectedUser, setSelectedUser] = useState(null);
    const [viewModal, setViewModal] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [addUserModal, setAddUserModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [newUserForm, setNewUserForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: '',
        status: 'Active'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 5;

    // Helper functions
    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getAvatarColor = (role) => {
        const colors = {
            'Admin': 'bg-purple-500',
            'Analyst': 'bg-blue-500', 
            'Investigator': 'bg-orange-500',
            'Viewer': 'bg-gray-500'
        };
        return colors[role] || 'bg-gray-500';
    };

    const getRoleColor = (role) => {
        const colors = {
            'Admin': 'text-purple-500',
            'Analyst': 'text-blue-500',
            'Investigator': 'text-orange-500', 
            'Viewer': 'text-gray-500'
        };
        return colors[role] || 'text-gray-500';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        }) + ' ' + date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // ---------------- HANDLERS ----------------
    const handleViewUser = (user) => {
        setSelectedUser(user);
        setViewModal(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setEditForm(user);
        setEditModal(true);
    };

    const handleDeleteUser = (user) => {
        setSelectedUser(user);
        setDeleteModal(true);
    };

    const handleAddNewUser = () => {
        setAddUserModal(true);
    };

    const handleCloseAddUserModal = () => {
        setAddUserModal(false);
        setNewUserForm({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: '',
            status: 'Active'
        });
        setShowPassword(false);
    };

    const handleNewUserFormChange = (e) => {
        const { name, value } = e.target;
        setNewUserForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateUser = async () => {
        try {
            await axios.post('/api/auth/register', newUserForm);
            queryClient.invalidateQueries('admin-users');
            handleCloseAddUserModal();
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDeactivate = async () => {
        try {
            await axios.patch(`/api/auth/users/${selectedUser._id}/deactivate`);
            queryClient.invalidateQueries('admin-users');
        } catch (err) {
            console.error(err);
        }
        setDeleteModal(false);
    };

    const handleSaveEdit = async () => {
        try {
            await axios.put(`/api/auth/users/${selectedUser._id}`, editForm);
            queryClient.invalidateQueries('admin-users');
        } catch (err) {
            console.error(err);
        }
        setEditModal(false);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // ---------------- API ----------------
    const { data: stats, isLoading: statsLoading } = useQuery(
        'admin-dashboard-stats',
        async () => (await axios.get('/api/cases/stats/dashboard')).data
    );

    const { data: systemSummary, isLoading: summaryLoading } = useQuery(
        'admin-system-summary',
        async () => (await axios.get('/api/audit/system/summary')).data
    );

    const { data: usersData, isLoading: usersLoading } = useQuery(
        'admin-users',
        async () => (await axios.get('/api/auth/users')).data.users
    );

    // Helper function to map action types to user-friendly names
    const getActionDisplayName = (actionId) => {
        const actionMap = {
            'evidence_uploaded': 'Evidence Uploaded',
            'report_generated': 'Report Generated',
            'case_created': 'Case Created',
            'case_updated': 'Case Updated',
            'user_login': 'User Login',
            'evidence_analyzed': 'Evidence Analyzed',
            'case_closed': 'Case Closed',
            'report_downloaded': 'Report Downloaded'
        };
        return actionMap[actionId] || actionId || 'Other Actions';
    };

    // ---------------- DATA FOR CHARTS ----------------
    const investigatorStats =
        systemSummary?.topUsers?.map((u) => ({
            name: `${u.user?.firstName || 'Unknown'}`,
            actions: u.count
        })) || [];

    const actionDistribution = systemSummary?.summary?.length > 0 
        ? systemSummary.summary.map((item) => ({
            name: getActionDisplayName(item._id),
            value: item.count || 0
        }))
        : [
            { name: 'Evidence Uploaded', value: 45 },
            { name: 'Report Generated', value: 28 },
            { name: 'Case Created', value: 18 },
            { name: 'Evidence Analyzed', value: 15 },
            { name: 'Case Closed', value: 8 }
        ];

    const platformActivity =
        systemSummary?.dailyActivity?.map((day) => ({
            name: `${day._id.month}/${day._id.day}`,
            activity: day.count
        })) || [];

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    // Custom tooltip component for better visibility
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{`${label}`}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-gray-700 dark:text-gray-300">
                            {`${entry.dataKey}: ${entry.value}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (statsLoading || summaryLoading || usersLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">

                {/* HEADER */}
                <div className="border-b border-dark-700 pb-4">
                    <h1 className="text-3xl font-bold flex items-center">
                        <ShieldAlert className="h-8 w-8 text-red-500 mr-3" />
                        Administrator Workspace
                    </h1>
                </div>

                {/* STATS */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="card p-6 flex items-center gap-4">
                        <Users className="text-blue-500" />
                        <div>
                            <p>Active Investigators</p>
                            <p className="text-2xl font-bold">
                                {systemSummary?.topUsers?.length || 0}
                            </p>
                        </div>
                    </div>

                    <div className="card p-6 flex items-center gap-4">
                        <Database className="text-green-500" />
                        <div>
                            <p>Total Evidence</p>
                            <p className="text-2xl font-bold">
                                {stats?.totalEvidence || 0}
                            </p>
                        </div>
                    </div>

                    <div className="card p-6 flex items-center gap-4">
                        <Activity className="text-purple-500" />
                        <p>Real-time Monitoring</p>
                    </div>
                </div>

                {/* ---------------- CHARTS ---------------- */}
                <div className="grid lg:grid-cols-2 gap-6">

                    {/* BAR */}
                    <div className="card p-6 h-80">
                        <h2 className="mb-4 font-semibold">Investigator Performance</h2>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={investigatorStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="actions" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* LINE */}
                    <div className="card p-6 h-80">
                        <h2 className="mb-4 font-semibold">Platform Activity</h2>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={platformActivity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="activity" stroke="#8b5cf6" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* PIE */}
                    <div className="card p-6 h-80">
                        <h2 className="mb-4 font-semibold">Action Distribution</h2>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={actionDistribution} dataKey="value" outerRadius={100}>
                                    {actionDistribution.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                </div>

                {/* USERS LIST SECTION */}
                <div className="space-y-4">
                    {/* Users List Heading */}
                    <h2 className="text-2xl font-bold text-white">Users List</h2>
                    
                    {/* USERS LIST */}
                    <div className="card">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-dark-700">
                            <h3 className="text-lg font-medium text-white">Manage Users</h3>
                            <button 
                                onClick={handleAddNewUser}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                Add New User
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-dark-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined On</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Login</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-dark-900 divide-y divide-dark-700">
                                    {usersData?.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage).map((user, i) => (
                                        <tr key={user._id} className="hover:bg-dark-800">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                {(currentPage - 1) * usersPerPage + i + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`flex-shrink-0 h-8 w-8 rounded-full ${getAvatarColor(user.role)} flex items-center justify-center text-white text-sm font-medium`}>
                                                        {getInitials(user.firstName, user.lastName)}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-100">
                                                            {user.firstName} {user.lastName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${getRoleColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.isActive !== false ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                                }`}>
                                                    {user.isActive !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {formatDate(user.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {formatDateTime(user.lastLogin)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    <button 
                                                        onClick={() => handleViewUser(user)}
                                                        className="text-indigo-400 hover:text-indigo-300"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEditUser(user)}
                                                        className="text-yellow-400 hover:text-yellow-300"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-3 border-t border-dark-700">
                            <div className="text-sm text-gray-400">
                                Showing {(currentPage - 1) * usersPerPage + 1} to {Math.min(currentPage * usersPerPage, usersData?.length || 0)} of {usersData?.length || 0} users
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                
                                {Array.from({ length: Math.ceil((usersData?.length || 0) / usersPerPage) }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-1 text-sm rounded ${
                                            currentPage === page
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil((usersData?.length || 0) / usersPerPage)))}
                                    disabled={currentPage === Math.ceil((usersData?.length || 0) / usersPerPage)}
                                    className="p-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADD NEW USER MODAL */}
            {addUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-dark-900 rounded-lg p-6 w-full max-w-md mx-4 border border-dark-700">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white">Add New User</h3>
                            <button 
                                onClick={handleCloseAddUserModal}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={newUserForm.firstName}
                                    onChange={handleNewUserFormChange}
                                    placeholder="Enter first name"
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={newUserForm.lastName}
                                    onChange={handleNewUserFormChange}
                                    placeholder="Enter last name"
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={newUserForm.email}
                                    onChange={handleNewUserFormChange}
                                    placeholder="Enter email address"
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={newUserForm.password}
                                        onChange={handleNewUserFormChange}
                                        placeholder="Enter password"
                                        className="w-full px-3 py-2 pr-10 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Role
                                </label>
                                <select
                                    name="role"
                                    value={newUserForm.role}
                                    onChange={handleNewUserFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="">Select role</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Analyst">Analyst</option>
                                    <option value="Investigator">Investigator</option>
                                    <option value="Viewer">Viewer</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={newUserForm.status}
                                    onChange={handleNewUserFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={handleCloseAddUserModal}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={!newUserForm.firstName || !newUserForm.lastName || !newUserForm.email || !newUserForm.password || !newUserForm.role}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                Create User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW USER DETAILS MODAL */}
            {viewModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-dark-900 rounded-lg p-6 w-full max-w-2xl mx-4 border border-dark-700">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white">User Details</h3>
                            <button 
                                onClick={() => setViewModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center mb-6">
                            <div className={`flex-shrink-0 h-16 w-16 rounded-full ${getAvatarColor(selectedUser.role)} flex items-center justify-center text-white text-xl font-medium`}>
                                {getInitials(selectedUser.firstName, selectedUser.lastName)}
                            </div>
                            <div className="ml-4">
                                <h4 className="text-lg font-medium text-white">
                                    {selectedUser.firstName} {selectedUser.lastName}
                                </h4>
                                <p className={`text-sm ${getRoleColor(selectedUser.role)}`}>
                                    {selectedUser.role}
                                </p>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                                    selectedUser.isActive !== false ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                }`}>
                                    {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <div>
                                <h5 className="text-sm font-medium text-gray-300 mb-3">Personal Information</h5>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Full Name</p>
                                        <p className="text-sm text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Email</p>
                                        <p className="text-sm text-white">{selectedUser.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Badge Number</p>
                                        <p className="text-sm text-white">{selectedUser.badgeNumber || 'DF12345'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Phone Number</p>
                                        <p className="text-sm text-white">{selectedUser.phoneNumber || '+91 9876543210'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div>
                                <h5 className="text-sm font-medium text-gray-300 mb-3">Account Information</h5>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Role</p>
                                        <p className={`text-sm font-medium ${getRoleColor(selectedUser.role)}`}>
                                            {selectedUser.role}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Status</p>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            selectedUser.isActive !== false ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                        }`}>
                                            {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Joined On</p>
                                        <p className="text-sm text-white">{formatDate(selectedUser.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Login History */}
                        <div className="mt-6">
                            <h5 className="text-sm font-medium text-gray-300 mb-3">Login History (Last 5)</h5>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center py-2 px-3 bg-dark-800 rounded">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm text-gray-300">192.168.1.10</span>
                                        <span className="text-xs text-gray-400">Firefox on Windows</span>
                                    </div>
                                    <span className="text-xs text-gray-400">23 Apr 2026, 6:56 PM</span>
                                </div>
                                <div className="flex justify-between items-center py-2 px-3 bg-dark-800 rounded">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm text-gray-300">192.168.1.8</span>
                                        <span className="text-xs text-gray-400">Firefox on Windows</span>
                                    </div>
                                    <span className="text-xs text-gray-400">23 Apr 2026, 2:41 PM</span>
                                </div>
                                <div className="flex justify-between items-center py-2 px-3 bg-dark-800 rounded">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm text-gray-300">192.168.1.5</span>
                                        <span className="text-xs text-gray-400">Chrome on Android</span>
                                    </div>
                                    <span className="text-xs text-gray-400">22 Apr 2026, 11:30 AM</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setViewModal(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-dark-900 rounded-lg p-6 w-full max-w-md mx-4 border border-dark-700">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white">Edit User</h3>
                            <button 
                                onClick={() => setEditModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={editForm.firstName || ''}
                                    onChange={handleEditFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={editForm.lastName || ''}
                                    onChange={handleEditFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={editForm.email || ''}
                                    onChange={handleEditFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={editForm.phoneNumber || ''}
                                    onChange={handleEditFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Department
                                </label>
                                <select
                                    name="department"
                                    value={editForm.department || 'Digital Forensics'}
                                    onChange={handleEditFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="Digital Forensics">Digital Forensics</option>
                                    <option value="Cyber Crime">Cyber Crime</option>
                                    <option value="Investigation">Investigation</option>
                                    <option value="Analysis">Analysis</option>
                                </select>
                            </div>

                            {/* Badge Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Badge Number
                                </label>
                                <input
                                    type="text"
                                    name="badgeNumber"
                                    value={editForm.badgeNumber || ''}
                                    onChange={handleEditFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Role
                                </label>
                                <select
                                    name="role"
                                    value={editForm.role || ''}
                                    onChange={handleEditFormChange}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Analyst">Analyst</option>
                                    <option value="Investigator">Investigator</option>
                                    <option value="Viewer">Viewer</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    name="isActive"
                                    value={editForm.isActive !== false ? 'Active' : 'Inactive'}
                                    onChange={(e) => handleEditFormChange({
                                        target: {
                                            name: 'isActive',
                                            value: e.target.value === 'Active'
                                        }
                                    })}
                                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setEditModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE/DEACTIVATE USER MODAL */}
            {deleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-dark-900 rounded-lg p-6 w-full max-w-md mx-4 border border-dark-700">
                        {/* Modal Header */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                <Trash2 size={32} className="text-white" />
                            </div>
                        </div>

                        <div className="text-center">
                            <h3 className="text-xl font-semibold text-white mb-2">Deactivate User</h3>
                            <p className="text-gray-300 mb-4">
                                Are you sure you want to deactivate the user <br />
                                <span className="font-medium text-white">{selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})?</span>
                            </p>
                            <p className="text-sm text-gray-400 mb-6">
                                This user will not be able to login to the system.
                            </p>

                            {/* Warning */}
                            <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3 mb-6">
                                <div className="flex items-center">
                                    <AlertTriangle size={16} className="text-yellow-500 mr-2" />
                                    <p className="text-sm text-yellow-200">
                                        This action can be reversed later from the user management section.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-center space-x-3">
                            <button
                                onClick={() => setDeleteModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeactivate}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                Deactivate User
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};

export default AdminDashboard;
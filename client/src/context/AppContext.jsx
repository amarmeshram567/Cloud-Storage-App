import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import api from '../config/api'



const AppContext = createContext()


const ROOT_BREADCRUMB = [{ id: null, name: "My Drive" }]
const getErrMsg = (err, fallback) => err.response?.data?.error || fallback;


export const AppProvider = ({ children }) => {

    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    // upload global state 
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    // drive view state 
    const [currentFolderId, setCurrentFolderId] = useState(null)
    const [breadcrumbs, setBreadcrumbs] = useState(ROOT_BREADCRUMB)
    const [folders, setFolders] = useState([])
    const [files, setFiles] = useState([])
    const [isDriveLoading, setIsDriveLoading] = useState(false)

    // filter & sort state
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState("name_asc")


    // Refresh User profile & storage stats 
    const refreshUser = useCallback(async () => {
        try {
            const { data } = await api.get("/api/auth/me")
            setUser(data.user)
            return true
        } catch (err) {
            setUser(null)
            return false
        }
    }, [])

    // check auth stats on app load 
    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false))
    }, [refreshUser])


    // auth actions helper
    const authAction = async (requestFn, successMsg, errorFallback) => {
        try {
            const { data } = await requestFn()
            setUser(data.user)
            if (successMsg) toast.success(successMsg)
            return true
        } catch (err) {
            toast.error(getErrMsg(err, errorFallback))
            return false
        }
    }

    const login = (email, password) => {
        return authAction(() => api.post("/api/auth/login", { email, password }), "Welcome Back!", "Login Failed")
    }

    const register = (name, email, password) => {
        return authAction(() => api.post("/api/auth/register", { name, email, password }), "Account created successfully", "Registration Failed")
    }

    const logout = async () => {
        try {
            await api.post("/api/auth/logout")
            setUser(null)
            toast.success("Logout out")
        } catch (err) {
            toast.error("Logout error")
        }
    }


    const fetchDriveContent = useCallback(() => {
        async (folderId = currentFolderId, search = searchQuery, sort = sortBy) => {
            if (!user) return;
            setIsDriveLoading(true)
            try {
                const parentParam = folderId || 'null'
                const [folderRes, fileRes, detailRes] = await Promise.all([
                    api.get("/api/folders", { params: { parent_id: parentParam } }),
                    api.get("/api/files", { params: { folder_id: parentParam, search, sort } }),
                    folderId ? api.get(`/api/folders/${folderId}`) : null
                ])

                setFolders(folderRes.data.folders)
                setFiles(fileRes.data.files)
                setBreadcrumbs(detailRes?.data?.breadcrumbs || ROOT_BREADCRUMB)
            } catch {
                toast.error("Error loading drive content")
            }
            finally {
                setIsDriveLoading(false)
            }
        }
    }, [user, currentFolderId, searchQuery, sortBy])




    const value = {
        user, setUser, login, register, logout,
        isLoading, isAuthenticated: !!user,
        isUploading, setIsUploading, uploadProgress, setUploadProgress,
        currentFolderId, setCurrentFolderId, fetchDriveContent, breadcrumbs,
        folders, files, isDriveLoading,
        searchQuery, setSearchQuery, sortBy, setSortBy,
        refreshUser, setFolders, folders, files, setFiles

    }


    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useApp = () => useContext(AppContext)
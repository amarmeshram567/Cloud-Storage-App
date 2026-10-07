import { useApp } from "../context/AppContext";
import { toast } from "react-hot-toast";
import api from "../config/api";



const isFolderItem = (item) => item?.type === "folder" || (!item?.mime_type && item?.path !== undefined)

export function useDrive() {
    const {
        fetchDriveContent,
        refreshUser,
        currentFolderId,
        isUploading,
        setIsUploading,
        uploadProgress,
        setUploadProgress
    } = useApp()

    // Reusable api action runner with standard toast & callback
    const runAction = async (apiCall, successMessage, errorMessage, afterSuccess) => {
        try {
            const res = await apiCall()
            if (successMessage) toast.success(successMessage)
            if (afterSuccess) await afterSuccess(res?.data)

            return true

        } catch (error) {
            toast.error(error?.response?.data?.message || errorMessage || "An error occurred")
        }
    }

    // File Upload with simulated progress 
    const uploadFiles = async (fileList, folder_id = currentFolderId) => {
        if (!fileList?.length) return;
        setIsUploading(true)
        setUploadProgress(0)

        const totalSize = Array.from(fileList).reduce((acc, file) => acc + (file.size || 0), 0)
        const step = 92 / Math.max(12, totalSize / 409715.2) // Simulate progress based on total size
        const interval = setInterval(() => {
            setUploadProgress((p) => (p >= 92 ? p : Math.min(92, p + step)))
        }, 100)

        const formData = new FormData()
        Array.from(fileList).forEach((f) => formData.append("files", f))
        if (folder_id) formData.append("folder_id", folder_id)
        try {
            const { data } = await api.post("/api/files/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                }
            })

            clearInterval(interval)
            setUploadProgress(100)

            await new Promise((r) => setTimeout(r, 300))

            toast.success(`${data.files.length} file(s) uploaded successfully`)

            await fetchDriveContent(folder_id)
            await refreshUser() // Refresh user data to update storage usage
        } catch (error) {
            clearInterval(interval)
            toast.error(error?.response?.data?.message || "An error occurred")
        }
        finally {
            clearInterval(interval)
            setIsUploading(false)
            setUploadProgress(0)
        }
    }

    // Create folder
    const createFolder = (name, parent_id = currentFolderId) =>
        runAction(
            api.post("/api/folders", { name, parent_id }),
            `${name} created successfully`,
            "Failed to create folder",
            () => fetchDriveContent(parent_id)
        )


    // Polymorphic operation (accepts file or folder item/id)
    const renameItem = (item, newName) => {
        const isFolder = isFolderItem(item)
        const endPoint = isFolder ? "folders" : "files";
        const id = item.id || item
        return runAction(
            api.path(`/api/${endPoint}/${id}/rename`, { name: newName }),
            `${isFolder ? "Folder" : "File"} renamed successfully`, "Error renaming item", () => fetchDriveContent()
        )
    }

    const moveItem = (item, targetFolderId) => {
        const isFolder = isFolderItem(item)
        const endPoint = isFolder ? "folders" : "files";
        const payload = isFolder ? { target_parent: targetFolderId } : { targe_folder: targetFolderId }
        const id = item.id || item
        return runAction(
            api.patch(`/api/${endPoint}/${id}/move`, payload),
            `${isFolder ? "Folder" : "File"} moved successfully`, "Error moving item", () => fetchDriveContent()
        )
    }


    // delete items 
    const deleteItem = (item) => {
        const isFolder = isFolderItem(item)
        const endPoint = isFolder ? "folders" : "files";
        const id = item.id || item
        return runAction(
            api.delete(`/api/${endPoint}/${id}`),
            `${isFolder ? "Folder" : "File"} moved to recycle bin`, "Error deleting item", () => fetchDriveContent()
        )
    }


    const restoreItem = (item) => {
        const endPoint = isFolderItem(item) ? "folders" : "files";
        const id = item.id || item
        return runAction(
            api.post(`/api/${endPoint}/${id}/restore`),
            `restored successfully`, "Error restoring item"
        )
    }


    const permanentDeleteItem = (item) => {
        const endPoint = isFolderItem(item) ? "folders" : "files";
        const id = item.id || item
        return runAction(
            api.delete(`/api/${endPoint}/${id}/permanent`),
            `permanently deleted successfully`, "Error permanently deleting item", () => refreshUser()
        )
    }

    return {
        uploadFiles,
        createFolder,
        renameItem,
        moveItem,
        deleteItem,
        restoreItem,
        permanentDeleteItem,
        isUploading,
        uploadProgress
    }
}


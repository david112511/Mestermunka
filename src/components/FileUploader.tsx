import React, { useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Film, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface FileUploaderProps {
  onUploadComplete: (fileData: {
    url: string;
    type: string;
    name: string;
    size: number;
    thumbnailUrl?: string;
  }) => void;
  onCancel: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Ellenőrizzük a fájl méretét (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const getFileType = (file: File): 'image' | 'video' | 'file' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
    if (file.type.startsWith('video/')) return <Film className="h-6 w-6 text-purple-500" />;
    return <FileText className="h-6 w-6 text-gray-500" />;
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setProgress(0);
    
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileType = getFileType(selectedFile);
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${fileType}s/${fileName}`;
      
      // Feltöltjük a fájlt a Supabase Storage-ba
      const { data, error } = await supabase.storage
        .from('message_attachments')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) throw error;
      
      // Manuálisan frissítjük a progress-t, mivel az onUploadProgress nem támogatott
      setProgress(100);
      
      // Lekérjük a publikus URL-t
      const { data: { publicUrl } } = supabase.storage
        .from('message_attachments')
        .getPublicUrl(filePath);
        
      // Ha kép, generálunk egy thumbnail-t is
      let thumbnailUrl;
      if (fileType === 'image') {
        thumbnailUrl = publicUrl;
      } else if (fileType === 'video') {
        // Videó esetén placeholder thumbnail
        thumbnailUrl = '/video-thumbnail.png';
      }
      
      // Visszaadjuk a feltöltött fájl adatait
      onUploadComplete({
        url: publicUrl,
        type: fileType,
        name: selectedFile.name,
        size: selectedFile.size,
        thumbnailUrl
      });
      
    } catch (error: any) {
      console.error('Hiba a fájl feltöltése közben:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Fájl feltöltése</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {!selectedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mb-4">
            Húzd ide a fájlt, vagy kattints a feltöltéshez
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            Fájl kiválasztása
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-4">
            {getFileIcon(selectedFile)}
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {uploading && (
            <div className="mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1 text-right">{progress}%</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={uploading}
            >
              Mégse
            </Button>
            <Button
              onClick={uploadFile}
              disabled={uploading}
            >
              {uploading ? 'Feltöltés...' : 'Feltöltés'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@propad/ui";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";

interface ProfilePhotoUploaderProps {
  endpoint: string;
  currentUrl?: string | null;
  label?: string;
  onUploaded?: (url: string) => void;
}

export function ProfilePhotoUploader({
  endpoint,
  currentUrl,
  label = "Profile photo",
  onUploaded,
}: ProfilePhotoUploaderProps) {
  const { data } = useSession();
  const apiBaseUrl = getRequiredPublicApiBaseUrl();
  const token = data?.accessToken as string | undefined;
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!selectedFile || !token) return;
    const file = selectedFile;
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", `${apiBaseUrl}${endpoint}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText) as { url: string };
        onUploaded?.(response.url);
        setProgress(0);
        setSelectedFile(null);
      }
    };
    xhr.onerror = () => {
      setUploading(false);
    };
    setUploading(true);
    xhr.send(formData);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
              N/A
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-800">{label}</p>
          <p className="text-xs text-neutral-500">
            Upload a square JPG/PNG/WebP image.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          disabled={uploading}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? `Uploading ${progress}%` : "Save photo"}
        </button>
      </div>
      {uploading && (
        <div className="h-1.5 w-full rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

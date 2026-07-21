"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Video } from "@/components/admin/tiptap-video";

type Props = {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  /** Allow inserting photos/videos into the content */
  enableMedia?: boolean;
};

function ToolbarButton({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-w-8 rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50",
        active && "bg-[#C9A227]/25 text-[#0F172A]"
      )}
    >
      {children}
    </button>
  );
}

function normalizeHtml(html: string) {
  if (!html || html === "<p></p>") return "";
  return html;
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 900_000) return file;
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
  );
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

export function RichTextEditor({
  name,
  label,
  defaultValue = "",
  placeholder = "Écrivez ici…",
  enableMedia = false,
}: Props) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [mediaPending, setMediaPending] = useState<"photo" | "video" | "drive" | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaOk, setMediaOk] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#C9A227] underline" },
      }),
      TiptapImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-sm my-3",
        },
      }),
      Video,
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue || "",
    onCreate: ({ editor: ed }) => {
      if (hiddenRef.current) {
        hiddenRef.current.value = normalizeHtml(ed.getHTML());
      }
    },
    onUpdate: ({ editor: ed }) => {
      if (hiddenRef.current) {
        hiddenRef.current.value = normalizeHtml(ed.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] max-w-none px-3 py-2 text-sm text-[#0F172A] focus:outline-none",
      },
    },
  });

  function syncHidden() {
    if (hiddenRef.current && editor) {
      hiddenRef.current.value = normalizeHtml(editor.getHTML());
    }
  }

  async function uploadAndInsert(file: File, kind: "photo" | "video") {
    if (!editor) return;
    setMediaPending(kind);
    setMediaError(null);
    setMediaOk(null);
    try {
      const toSend =
        kind === "photo" && file.type.startsWith("image/")
          ? await compressImage(file)
          : file;
      const fd = new FormData();
      fd.append("file", toSend);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMediaError(data.error || "Échec du téléversement.");
        return;
      }
      if (data.kind === "video" || kind === "video") {
        editor.chain().focus().setVideo({ src: data.url }).run();
        setMediaOk("Vidéo ajoutée dans le texte.");
      } else {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
        setMediaOk("Photo ajoutée dans le texte.");
      }
      syncHidden();
    } catch {
      setMediaError("Impossible d'envoyer le fichier.");
    } finally {
      setMediaPending(null);
      if (photoRef.current) photoRef.current.value = "";
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  async function importDriveIntoContent() {
    if (!editor || !driveUrl.trim()) {
      setMediaError("Collez un lien Google Drive.");
      return;
    }
    setMediaPending("drive");
    setMediaError(null);
    setMediaOk(null);
    try {
      const res = await fetch("/api/upload/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMediaError(data.error || "Import Drive impossible.");
        return;
      }
      if (data.kind === "video") {
        editor.chain().focus().setVideo({ src: data.url }).run();
        setMediaOk("Vidéo Drive ajoutée dans le texte.");
      } else {
        editor.chain().focus().setImage({ src: data.url }).run();
        setMediaOk("Photo Drive ajoutée dans le texte.");
      }
      setDriveUrl("");
      syncHidden();
    } catch {
      setMediaError("Erreur réseau lors de l'import Drive.");
    } finally {
      setMediaPending(null);
    }
  }

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="overflow-hidden border border-slate-300 bg-white">
        {editor ? (
          <>
            <div className="flex flex-wrap gap-0.5 border-b border-slate-200 bg-slate-50 p-1.5">
              <ToolbarButton
                title="Gras"
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                G
              </ToolbarButton>
              <ToolbarButton
                title="Italique"
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <span className="italic">I</span>
              </ToolbarButton>
              <ToolbarButton
                title="Souligné"
                active={editor.isActive("underline")}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <span className="underline">S</span>
              </ToolbarButton>
              <ToolbarButton
                title="Barré"
                active={editor.isActive("strike")}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <span className="line-through">ab</span>
              </ToolbarButton>
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              <ToolbarButton
                title="Titre"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
              >
                H2
              </ToolbarButton>
              <ToolbarButton
                title="Sous-titre"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
              >
                H3
              </ToolbarButton>
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              <ToolbarButton
                title="Liste à puces"
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                • Liste
              </ToolbarButton>
              <ToolbarButton
                title="Liste numérotée"
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                1. Liste
              </ToolbarButton>
              <ToolbarButton
                title="Citation"
                active={editor.isActive("blockquote")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                « »
              </ToolbarButton>
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              <ToolbarButton
                title="Gauche"
                active={editor.isActive({ textAlign: "left" })}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              >
                Gauche
              </ToolbarButton>
              <ToolbarButton
                title="Centre"
                active={editor.isActive({ textAlign: "center" })}
                onClick={() =>
                  editor.chain().focus().setTextAlign("center").run()
                }
              >
                Centre
              </ToolbarButton>
              <ToolbarButton
                title="Droite"
                active={editor.isActive({ textAlign: "right" })}
                onClick={() =>
                  editor.chain().focus().setTextAlign("right").run()
                }
              >
                Droite
              </ToolbarButton>
              <span className="mx-1 w-px self-stretch bg-slate-200" />
              <ToolbarButton
                title="Lien"
                active={editor.isActive("link")}
                onClick={() => {
                  const prev = editor.getAttributes("link").href as
                    | string
                    | undefined;
                  const url = window.prompt(
                    "Adresse du lien",
                    prev || "https://"
                  );
                  if (url === null) return;
                  if (url === "") {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .unsetLink()
                      .run();
                    return;
                  }
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .setLink({ href: url })
                    .run();
                }}
              >
                Lien
              </ToolbarButton>
              <ToolbarButton
                title="Effacer la mise en forme"
                onClick={() =>
                  editor.chain().focus().clearNodes().unsetAllMarks().run()
                }
              >
                Effacer
              </ToolbarButton>
            </div>
            <EditorContent editor={editor} />
          </>
        ) : (
          <div className="h-44 animate-pulse bg-slate-50" />
        )}
      </div>

      {enableMedia ? (
        <div className="mt-2 space-y-2 rounded-sm border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-medium text-slate-600">
            Insérer une photo ou une vidéo dans le texte
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAndInsert(f, "photo");
              }}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAndInsert(f, "video");
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mediaPending !== null || !editor}
              onClick={() => photoRef.current?.click()}
            >
              {mediaPending === "photo" ? "Photo…" : "Photo (ordinateur)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mediaPending !== null || !editor}
              onClick={() => videoRef.current?.click()}
            >
              {mediaPending === "video" ? "Vidéo…" : "Vidéo (ordinateur)"}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Vidéo max 20 Mo (MP4/WEBM/MOV). Photo max 8 Mo.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="Lien Google Drive (photo ou vidéo)"
              className="bg-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mediaPending !== null || !editor}
              onClick={() => void importDriveIntoContent()}
              className="shrink-0"
            >
              {mediaPending === "drive" ? "Import…" : "Importer Drive"}
            </Button>
          </div>
          {mediaOk ? <p className="text-xs text-emerald-700">{mediaOk}</p> : null}
          {mediaError ? <p className="text-xs text-red-600">{mediaError}</p> : null}
        </div>
      ) : null}

      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={normalizeHtml(defaultValue)}
      />
      <p className="text-xs text-slate-400">
        Traitement de texte type Word
        {enableMedia ? " + photos et vidéos dans le contenu" : ""}.
      </p>
    </div>
  );
}

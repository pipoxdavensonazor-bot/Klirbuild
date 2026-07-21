"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
};

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "min-w-8 rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200",
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

export function RichTextEditor({
  name,
  label,
  defaultValue = "",
  placeholder = "Écrivez ici…",
}: Props) {
  const hiddenRef = useRef<HTMLInputElement>(null);

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
          "min-h-[140px] max-w-none px-3 py-2 text-sm text-[#0F172A] focus:outline-none",
      },
    },
  });

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
                title="Aligner à gauche"
                active={editor.isActive({ textAlign: "left" })}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              >
                Gauche
              </ToolbarButton>
              <ToolbarButton
                title="Centrer"
                active={editor.isActive({ textAlign: "center" })}
                onClick={() =>
                  editor.chain().focus().setTextAlign("center").run()
                }
              >
                Centre
              </ToolbarButton>
              <ToolbarButton
                title="Aligner à droite"
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
                title="Annuler la mise en forme"
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
          <div className="h-36 animate-pulse bg-slate-50" />
        )}
      </div>
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={normalizeHtml(defaultValue)}
      />
      <p className="text-xs text-slate-400">
        Traitement de texte : gras, italique, listes, titres, alignement, liens.
      </p>
    </div>
  );
}

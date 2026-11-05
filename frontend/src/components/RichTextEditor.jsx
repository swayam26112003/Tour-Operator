import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import MediaAssetPicker from "./MediaAssetPicker";

const RICH_TEXT_EDITOR_STYLES = `
.rich-text-editor-content { min-height: 280px; outline: none; color: #536c5c; font-size: 14px; line-height: 1.9; }
.rich-text-editor-content > * + * { margin-top: 1rem; }
.rich-text-editor-content p { margin: 0 0 1rem; }
.rich-text-editor-content h2 { margin: 1.6rem 0 0.65rem; color: #174b38; font-family: Georgia, serif; font-size: 1.75rem; line-height: 1.3; }
.rich-text-editor-content h3 { margin: 1.3rem 0 0.55rem; color: #174b38; font-family: Georgia, serif; font-size: 1.35rem; line-height: 1.35; }
.rich-text-editor-content ul, .rich-text-editor-content ol { margin: 1rem 0; padding-left: 1.5rem; }
.rich-text-editor-content ul { list-style: disc; }
.rich-text-editor-content ol { list-style: decimal; }
.rich-text-editor-content li { margin: 0.3rem 0; }
.rich-text-editor-content blockquote { margin: 1.4rem 0; border-left: 3px solid #a17e50; padding: 0.5rem 1rem; background: #f7f8f4; color: #66766a; }
.rich-text-editor-content a { color: #174b38; text-decoration: underline; }
.rich-text-editor-content img { display: block; max-width: 100%; max-height: 520px; margin: 1.5rem auto; object-fit: contain; }
.rich-text-editor-content hr { margin: 1.5rem 0; border-color: #e4e7df; }
`;

const ToolbarButton = ({ active = false, disabled = false, onClick, children, title }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    className={`rounded border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "border-[#174b38] bg-[#e8eee5] text-[#174b38]"
        : "border-[#e4e7df] bg-white text-[#536c5c] hover:border-[#174b38]"
    }`}
  >
    {children}
  </button>
);

const RichTextEditor = ({ value = "", onChange, placeholder = "Start writing your story..." }) => {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "journal-inline-image",
        },
      }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "rich-text-editor-content",
        "aria-label": "Article body editor",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || "<p></p>";
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
  }, [editor, value]);

  const insertLink = () => {
    if (!editor) return;
    const currentHref = editor.getAttributes("link").href || "https://";
    const href = window.prompt("Enter the link URL", currentHref);
    if (href === null) return;

    const trimmed = href.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) {
      window.alert("Please use an HTTPS, HTTP or mailto link.");
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  const insertSelectedImage = (asset) => {
    if (!editor || !asset?.url) return;
    editor
      .chain()
      .focus()
      .setImage({ src: asset.url, alt: asset.altText || asset.name || "Article image" })
      .run();
  };

  if (!editor) {
    return (
      <div className="min-h-[320px] animate-pulse rounded-lg border border-[#e4e7df] bg-[#f7f8f4]" />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#e4e7df] bg-white">
      <style>{RICH_TEXT_EDITOR_STYLES}</style>
      <div className="flex flex-wrap gap-2 border-b border-[#e8ebe4] bg-[#fbfcf9] p-3">
        <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><span className="underline">U</span></ToolbarButton>
        <span className="mx-1 h-8 border-l border-[#e1e5dc]" />
        <ToolbarButton title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
        <ToolbarButton title="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
        <ToolbarButton title="Block quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</ToolbarButton>
        <ToolbarButton title="Insert or edit link" active={editor.isActive("link")} onClick={insertLink}>Link</ToolbarButton>
        <ToolbarButton title="Insert image from Media Library" onClick={() => setMediaPickerOpen(true)}>Image</ToolbarButton>
        <span className="mx-1 h-8 border-l border-[#e1e5dc]" />
        <ToolbarButton title="Undo" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton>
        <ToolbarButton title="Redo" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
      </div>

      <div className="relative min-h-[320px] px-5 py-4" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <p className="pointer-events-none absolute left-5 top-4 text-sm text-[#a0aaa0]">
            {placeholder}
          </p>
        )}
      </div>
      <div className="border-t border-[#edf0ea] px-4 py-2 text-[10px] text-[#879187]">
        Formatting, headings, lists, links and images from your Media Library are supported.
      </div>

      {mediaPickerOpen && (
        <MediaAssetPicker
          title="Insert image into article"
          onClose={() => setMediaPickerOpen(false)}
          onSelect={insertSelectedImage}
        />
      )}
    </div>
  );
};

export default RichTextEditor;

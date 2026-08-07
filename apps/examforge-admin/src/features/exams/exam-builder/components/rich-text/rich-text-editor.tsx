"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";

import { cn } from "@/lib/utils";
import { editorHtmlToRichText } from "../../model/rich-text";
import type { RichTextValue } from "../../model/builder.types";
import {
  createRichTextExtensions,
  type MathNodeTarget,
} from "./rich-text-editor.extensions";
import { sanitizeEditorHtml } from "./rich-text-editor.utils";
import {
  RichTextLinkControls,
  type LinkEditTarget,
} from "./rich-text-link-controls";
import {
  RichTextMathControls,
  type MathEditTarget,
} from "./rich-text-math-controls";
import { RichTextTableControls } from "./rich-text-table-controls";
import { RichTextToolbar } from "./rich-text-toolbar";

interface Props {
  id: string;
  label: string;
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
}: Props) {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;
  const [mathTarget, setMathTarget] = useState<MathEditTarget | null>(null);
  const [linkTarget, setLinkTarget] = useState<LinkEditTarget | null>(null);
  const editMath = useCallback((target: MathNodeTarget) => {
    setLinkTarget(null);
    setMathTarget({ ...target, mode: "edit" });
  }, []);
  const extensions = useMemo(
    () => createRichTextExtensions({ onMathClick: editMath }),
    [editMath],
  );
  const editor = useEditor({
    extensions,
    content: sanitizeEditorHtml(value.html),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      transformPastedHTML: sanitizeEditorHtml,
      attributes: {
        class: "min-h-28",
        id,
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "aria-invalid": String(Boolean(invalid)),
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      const next = editorHtmlToRichText(nextEditor.getHTML());
      const external = editorHtmlToRichText(
        sanitizeEditorHtml(valueRef.current.html),
      );
      if (next.html !== external.html) onChangeRef.current(next);
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      const selection = nextEditor.state.selection;
      if (!(selection instanceof NodeSelection)) return;
      const kind =
        selection.node.type.name === "inlineMath"
          ? "inline"
          : selection.node.type.name === "blockMath"
            ? "block"
            : null;
      if (kind)
        editMath({
          kind,
          pos: selection.from,
          latex: String(selection.node.attrs.latex ?? ""),
        });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = sanitizeEditorHtml(value.html);
    if (
      editorHtmlToRichText(editor.getHTML()).html !==
      editorHtmlToRichText(next).html
    )
      editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value.html]);
  useEffect(() => {
    editor?.setEditable(!disabled);
    if (disabled) {
      setMathTarget(null);
      setLinkTarget(null);
    }
  }, [disabled, editor]);
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        transformPastedHTML: sanitizeEditorHtml,
        attributes: {
          class: "min-h-28",
          id,
          role: "textbox",
          "aria-label": label,
          "aria-multiline": "true",
          "aria-invalid": String(Boolean(invalid)),
        },
      },
    });
  }, [editor, id, invalid, label]);
  if (!editor)
    return (
      <div
        className="h-28 animate-pulse border bg-muted/30"
        aria-label={`Loading ${label}`}
      />
    );

  function openLink() {
    const { from, to } = editor!.state.selection;
    setMathTarget(null);
    setLinkTarget({
      from,
      to,
      href: String(editor!.getAttributes("link").href ?? ""),
    });
  }

  function openMath(kind: "inline" | "block") {
    setLinkTarget(null);
    setMathTarget({
      mode: "insert",
      kind,
      latex: "",
      pos: editor!.state.selection.from,
    });
  }

  return (
    <div
      className={cn(
        "border bg-background focus-within:ring-2 focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      <RichTextToolbar
        editor={editor}
        editorId={id}
        label={label}
        disabled={disabled}
        onLink={openLink}
        insertControls={
          <>
            <RichTextMathControls
              editor={editor}
              target={mathTarget}
              disabled={disabled}
              onInsert={() => openMath("inline")}
              onClose={() => {
                setMathTarget(null);
                editor.commands.focus();
              }}
            />
            <RichTextTableControls editor={editor} disabled={disabled} />
          </>
        }
      />
      <RichTextLinkControls
        editor={editor}
        target={linkTarget}
        onClose={() => {
          setLinkTarget(null);
          editor.commands.focus();
        }}
      />
      <EditorContent
        id={id}
        editor={editor}
        aria-label={label}
        aria-invalid={invalid}
        className="exam-rich-text min-h-28 max-w-full overflow-x-auto p-3"
      />
    </div>
  );
}

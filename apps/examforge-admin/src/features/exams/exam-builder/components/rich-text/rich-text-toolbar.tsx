"use client";

import type { Editor } from "@tiptap/core";
import {
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
  CodeBlockIcon,
  CodeIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";

interface Props {
  editor: Editor;
  editorId: string;
  label: string;
  disabled?: boolean;
  onLink: () => void;
  insertControls: React.ReactNode;
}

export function RichTextToolbar({
  editor,
  editorId,
  label,
  disabled,
  onLink,
  insertControls,
}: Props) {
  const button = (
    name: string,
    content: React.ReactNode,
    run: () => void,
    active = false,
    enabled = true,
  ) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={name}
            aria-pressed={active}
            disabled={disabled || !enabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={run}
          />
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
  const block = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : "paragraph";
  return (
    <div
      role="toolbar"
      aria-label={`${label} formatting`}
      className="flex max-w-full flex-wrap items-center gap-1 border-b p-1"
    >
      <label className="sr-only" htmlFor={`${editorId}-block-type`}>
        Text style
      </label>
      <select
        id={`${editorId}-block-type`}
        aria-label="Text style"
        className="h-7 border bg-background px-2 text-xs"
        value={block}
        disabled={disabled}
        onChange={(event) => {
          const chain = editor.chain().focus();
          if (event.target.value === "h2") chain.setHeading({ level: 2 }).run();
          else if (event.target.value === "h3")
            chain.setHeading({ level: 3 }).run();
          else chain.setParagraph().run();
        }}
      >
        <option value="paragraph">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      {button(
        "Bold",
        <TextBIcon weight="bold" />,
        () => editor.chain().focus().toggleBold().run(),
        editor.isActive("bold"),
        editor.can().toggleBold(),
      )}
      {button(
        "Italic",
        <TextItalicIcon />,
        () => editor.chain().focus().toggleItalic().run(),
        editor.isActive("italic"),
        editor.can().toggleItalic(),
      )}
      {button(
        "Underline",
        <TextUnderlineIcon />,
        () => editor.chain().focus().toggleUnderline().run(),
        editor.isActive("underline"),
        editor.can().toggleUnderline(),
      )}
      {button(
        "Strikethrough",
        <TextStrikethroughIcon />,
        () => editor.chain().focus().toggleStrike().run(),
        editor.isActive("strike"),
        editor.can().toggleStrike(),
      )}
      {button(
        "Bulleted list",
        <ListBulletsIcon />,
        () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive("bulletList"),
        editor.can().toggleBulletList(),
      )}
      {button(
        "Numbered list",
        <ListNumbersIcon />,
        () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive("orderedList"),
        editor.can().toggleOrderedList(),
      )}
      {button(
        "Blockquote",
        <QuotesIcon />,
        () => editor.chain().focus().toggleBlockquote().run(),
        editor.isActive("blockquote"),
        editor.can().toggleBlockquote(),
      )}
      {button(
        "Inline code",
        <CodeIcon />,
        () => editor.chain().focus().toggleCode().run(),
        editor.isActive("code"),
        editor.can().toggleCode(),
      )}
      {button(
        "Code block",
        <CodeBlockIcon />,
        () => editor.chain().focus().toggleCodeBlock().run(),
        editor.isActive("codeBlock"),
        editor.can().toggleCodeBlock(),
      )}
      {button(
        "Add or edit link",
        <LinkIcon />,
        onLink,
        editor.isActive("link"),
        !editor.state.selection.empty || editor.isActive("link"),
      )}
      {insertControls}
      {button("Clear formatting", <span aria-hidden="true">Tx</span>, () =>
        editor.chain().focus().unsetAllMarks().clearNodes().run(),
      )}
      {button(
        "Undo",
        <ArrowCounterClockwiseIcon />,
        () => editor.chain().focus().undo().run(),
        false,
        editor.can().undo(),
      )}
      {button(
        "Redo",
        <ArrowClockwiseIcon />,
        () => editor.chain().focus().redo().run(),
        false,
        editor.can().redo(),
      )}
    </div>
  );
}

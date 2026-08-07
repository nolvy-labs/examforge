"use client";

import type { Editor } from "@tiptap/core";
import { TableIcon } from "@phosphor-icons/react";

import { Button } from "@/components/shadcn/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";

export function RichTextTableControls({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const inTable = editor.isActive("table");
  const action = (
    label: string,
    run: () => boolean,
    enabled = true,
    destructive = false,
  ) => (
    <Button
      type="button"
      size="sm"
      variant={destructive ? "destructive" : "ghost"}
      className="justify-start"
      disabled={disabled || !enabled}
      onClick={run}
    >
      {label}
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={inTable ? "secondary" : "ghost"}
            size="icon-sm"
            disabled={disabled}
            aria-label={inTable ? "Edit table" : "Insert table"}
            onMouseDown={(event) => event.preventDefault()}
          />
        }
      >
        <TableIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-1 p-2">
        {action(
          "Insert 3 × 3 table",
          () =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
          editor.can().insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
        )}
        {inTable && (
          <>
            <div className="my-1 border-t" />
            <div className="grid grid-cols-2 gap-1">
              {action(
                "Add row above",
                () => editor.chain().focus().addRowBefore().run(),
                editor.can().addRowBefore(),
              )}
              {action(
                "Add row below",
                () => editor.chain().focus().addRowAfter().run(),
                editor.can().addRowAfter(),
              )}
              {action(
                "Delete row",
                () => editor.chain().focus().deleteRow().run(),
                editor.can().deleteRow(),
              )}
              {action(
                "Add column left",
                () => editor.chain().focus().addColumnBefore().run(),
                editor.can().addColumnBefore(),
              )}
              {action(
                "Add column right",
                () => editor.chain().focus().addColumnAfter().run(),
                editor.can().addColumnAfter(),
              )}
              {action(
                "Delete column",
                () => editor.chain().focus().deleteColumn().run(),
                editor.can().deleteColumn(),
              )}
              {action(
                "Toggle header row",
                () => editor.chain().focus().toggleHeaderRow().run(),
                editor.can().toggleHeaderRow(),
              )}
              {action(
                "Merge cells",
                () => editor.chain().focus().mergeCells().run(),
                editor.can().mergeCells(),
              )}
              {action(
                "Split cell",
                () => editor.chain().focus().splitCell().run(),
                editor.can().splitCell(),
              )}
              {action(
                "Delete table",
                () => editor.chain().focus().deleteTable().run(),
                editor.can().deleteTable(),
                true,
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

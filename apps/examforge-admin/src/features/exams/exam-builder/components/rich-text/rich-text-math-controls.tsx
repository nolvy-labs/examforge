"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import katex from "katex";

import { Button } from "@/components/shadcn/button";
import { Label } from "@/components/shadcn/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { Textarea } from "@/components/shadcn/textarea";
import { MathOperationsIcon } from "@phosphor-icons/react";

import type { MathNodeTarget } from "./rich-text-editor.extensions";
import { validateLatex } from "./rich-text-editor.utils";

export interface MathEditTarget extends MathNodeTarget {
  mode: "insert" | "edit";
}

export function RichTextMathControls({
  editor,
  target,
  onClose,
  onInsert,
  disabled,
}: {
  editor: Editor;
  target: MathEditTarget | null;
  onClose: () => void;
  onInsert: () => void;
  disabled?: boolean;
}) {
  const id = useId(),
    previewRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(target?.latex ?? "");
  const [kind, setKind] = useState<MathEditTarget["kind"]>(
    target?.kind ?? "inline",
  );
  useEffect(() => {
    if (target) {
      setDraft(target.latex);
      setKind(target.kind);
    }
  }, [target]);
  const error = target ? validateLatex(draft, kind === "block") : null;
  useEffect(() => {
    if (!target || !previewRef.current) return;
    previewRef.current.replaceChildren();
    katex.render(draft || "\\square", previewRef.current, {
      displayMode: kind === "block",
      throwOnError: false,
      trust: false,
    });
  }, [draft, kind, target]);
  const currentNode =
    target?.mode === "edit" ? editor.state.doc.nodeAt(target.pos) : null;
  const resolved =
    target?.mode === "edit" ? editor.state.doc.resolve(target.pos) : null;
  const canConvertInlineToBlock =
    target?.kind !== "inline" ||
    Boolean(
      currentNode &&
      resolved?.parent.isTextblock &&
      resolved.parent.childCount === 1,
    );

  function commit() {
    const latex = draft.trim();
    if (!latex || error) return;
    if (target!.mode === "insert") {
      const chain = editor.chain().focus().setTextSelection(target!.pos);
      if (kind === "block") chain.insertBlockMath({ latex }).run();
      else chain.insertInlineMath({ latex }).run();
    } else {
      const node = editor.state.doc.nodeAt(target!.pos);
      if (!node) return onClose();
      if (
        (node.type.name === "inlineMath" && kind === "inline") ||
        (node.type.name === "blockMath" && kind === "block")
      ) {
        if (kind === "block")
          editor.commands.updateBlockMath({ latex, pos: target!.pos });
        else editor.commands.updateInlineMath({ latex, pos: target!.pos });
      } else if (
        node.type.name === "inlineMath" &&
        kind === "block" &&
        resolved?.parent.isTextblock &&
        resolved.parent.childCount === 1
      ) {
        const replacement = editor.schema.nodes.blockMath?.create({ latex });
        if (replacement)
          editor.view.dispatch(
            editor.state.tr.replaceWith(
              resolved.before(),
              resolved.after(),
              replacement,
            ),
          );
      } else if (node.type.name === "blockMath" && kind === "inline") {
        const inline = editor.schema.nodes.inlineMath?.create({ latex });
        const paragraph =
          inline && editor.schema.nodes.paragraph?.create(null, inline);
        if (paragraph)
          editor.view.dispatch(
            editor.state.tr.replaceWith(
              target!.pos,
              target!.pos + node.nodeSize,
              paragraph,
            ),
          );
      }
      editor.commands.focus();
    }
    onClose();
  }

  function remove() {
    if (target!.mode === "edit") {
      if (target!.kind === "block")
        editor.commands.deleteBlockMath({ pos: target!.pos });
      else editor.commands.deleteInlineMath({ pos: target!.pos });
      editor.commands.focus();
    }
    onClose();
  }

  return (
    <Popover
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open && target) onClose();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={target ? "secondary" : "ghost"}
            size="icon-sm"
            disabled={disabled}
            aria-label={
              target?.mode === "edit" ? "Edit equation" : "Insert equation"
            }
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (!target) onInsert();
            }}
          />
        }
      >
        <MathOperationsIcon />
      </PopoverTrigger>
      {target && (
        <PopoverContent
          align="end"
          className="w-[min(26rem,calc(100vw-2rem))] gap-3 p-3"
          aria-label={`${target.mode === "insert" ? "Insert" : "Edit"} equation`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={id}>LaTeX source</Label>
            <div role="group" aria-label="Equation type" className="flex gap-1">
              <Button
                size="sm"
                variant={kind === "inline" ? "secondary" : "outline"}
                aria-pressed={kind === "inline"}
                onClick={() => setKind("inline")}
              >
                Inline
              </Button>
              <Button
                size="sm"
                variant={kind === "block" ? "secondary" : "outline"}
                aria-pressed={kind === "block"}
                disabled={!canConvertInlineToBlock}
                title={
                  !canConvertInlineToBlock
                    ? "Block conversion is available when the inline equation is the paragraph’s only content."
                    : undefined
                }
                onClick={() => setKind("block")}
              >
                Block
              </Button>
            </div>
          </div>
          <Textarea
            id={id}
            value={draft}
            rows={kind === "block" ? 3 : 1}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              } else if (
                event.key === "Enter" &&
                (kind === "inline" || event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault();
                commit();
              }
            }}
            autoFocus
          />
          <p id={`${id}-help`} className="text-xs text-muted-foreground">
            Enter confirms inline math. Ctrl/Cmd+Enter confirms block math.
          </p>
          <div
            className="max-w-full overflow-x-auto border bg-background p-3"
            aria-label="Equation preview"
            ref={previewRef}
          />
          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={Boolean(error)} onClick={commit}>
              {target.mode === "insert" ? "Insert equation" : "Save equation"}
            </Button>
            {target.mode === "edit" && (
              <Button size="sm" variant="destructive" onClick={remove}>
                Delete equation
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

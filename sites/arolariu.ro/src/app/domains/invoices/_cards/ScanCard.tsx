"use client";

/**
 * @fileoverview Controlled shared scan card for uploaded and pending scans.
 * @module app/domains/invoices/_cards/ScanCard
 */

import {Button, Card, CardContent, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input} from "@arolariu/components";
import {motion} from "motion/react";
import type {ReactNode} from "react";
import {useCallback} from "react";
import {TbCheck, TbDotsVertical, TbPencil, TbX} from "react-icons/tb";
import {ScanMediaPreview, type ScanMediaKind} from "./ScanMediaPreview";
import styles from "./ScanCard.module.scss";

type ScanCardAction = Readonly<{
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}>;

type RenameState = Readonly<{
  value: string;
  isEditing: boolean;
  onStart?: () => void;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  placeholder: string;
}>;

type SelectionState = Readonly<{
  checked: boolean;
  onToggle: () => void;
  label: string;
}>;

type ProgressState = Readonly<{
  value: number;
  label: string;
}>;

type Props = Readonly<{
  media: Readonly<{
    src: string;
    mediaKind: ScanMediaKind;
    alt: string;
    loading?: "eager" | "lazy";
    onPreviewActivate?: () => void;
  }>;
  title: string;
  metadataItems?: readonly string[];
  isSelected?: boolean;
  isLocked?: boolean;
  selection?: SelectionState;
  rename?: RenameState;
  actions?: readonly ScanCardAction[];
  statusBadge?: ReactNode;
  linkedBadge?: ReactNode;
  centerOverlay?: ReactNode;
  progress?: ProgressState;
  error?: string;
}>;

/**
 * Renders a shared scan card with caller-controlled actions.
 *
 * @param props - Scan card props.
 * @returns The rendered scan card.
 */
export default function ScanCard({
  media,
  title,
  metadataItems = [],
  isSelected = false,
  isLocked = false,
  selection,
  rename,
  actions = [],
  statusBadge,
  linkedBadge,
  centerOverlay,
  progress,
  error,
}: Readonly<Props>): React.JSX.Element {
  const handleStopPropagation = useCallback((event: React.SyntheticEvent): void => {
    event.stopPropagation();
  }, []);

  const handleRenameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (!rename) {
        return;
      }

      if (event.key === "Enter") {
        rename.onCommit();
      } else if (event.key === "Escape") {
        rename.onCancel();
      }
    },
    [rename],
  );

  const handleRenameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      rename?.onChange(event.target.value);
    },
    [rename],
  );

  return (
    <Card className={`${styles["card"]} ${isSelected ? styles["cardSelected"] : ""}`}>
      <CardContent className={styles["cardContentFlush"]}>
        <ScanMediaPreview
          {...media}
          topLeftOverlay={
            selection ? (
              <div
                role='presentation'
                onClick={handleStopPropagation}
                onKeyDown={handleStopPropagation}>
                <Checkbox
                  checked={selection.checked}
                  nativeButton
                  onCheckedChange={selection.onToggle}
                  aria-label={selection.label}
                  className={styles["checkbox"]}
                />
              </div>
            ) : undefined
          }
          topRightOverlay={statusBadge}
          bottomLeftOverlay={linkedBadge}
          bottomRightOverlay={
            actions.length > 0 ? (
              <div
                role='presentation'
                onClick={handleStopPropagation}
                onKeyDown={handleStopPropagation}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label='Open scan actions'
                        className={styles["actionsButton"]}>
                        <TbDotsVertical className={styles["menuIcon"]} />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align='end'>
                    {actions.map((action) => (
                      <DropdownMenuItem
                        key={action.key}
                        onClick={action.onSelect}
                        disabled={isLocked || action.disabled}
                        className={action.destructive ? styles["deleteMenuItem"] : undefined}>
                        {action.icon}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : undefined
          }
          centerOverlay={centerOverlay}
        />

        <div className={styles["fileInfo"]}>
          {rename?.isEditing ? (
            <motion.div
              initial={{opacity: 0, y: -5}}
              animate={{opacity: 1, y: 0}}
              className={styles["renameContainer"]}>
              <Input
                value={rename.value}
                onChange={handleRenameChange}
                onKeyDown={handleRenameKeyDown}
                onBlur={rename.onCancel}
                placeholder={rename.placeholder}
                className={styles["renameInput"]}
              />
              <div className={styles["renameActions"]}>
                <Button
                  size='sm'
                  variant='ghost'
                  aria-label='Save rename'
                  onMouseDown={rename.onCommit}
                  className={styles["renameSaveButton"]}>
                  <TbCheck className={styles["renameIcon"]} />
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  aria-label='Cancel rename'
                  onMouseDown={rename.onCancel}
                  className={styles["renameCancelButton"]}>
                  <TbX className={styles["renameIcon"]} />
                </Button>
              </div>
            </motion.div>
          ) : (
            <div
              className={styles["fileNameContainer"]}
              role='presentation'
              onDoubleClick={rename?.onStart}>
              <motion.p
                className={styles["fileName"]}
                title={title}>
                {title}
              </motion.p>
              {rename?.onStart ? (
                <Button
                  size='sm'
                  variant='ghost'
                  aria-label='Rename scan'
                  onClick={rename.onStart}
                  disabled={isLocked}
                  className={styles["editButton"]}>
                  <TbPencil className={styles["editIcon"]} />
                </Button>
              ) : null}
            </div>
          )}

          {metadataItems.length > 0 ? (
            <div className={styles["fileMeta"]}>
              {metadataItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}

          {progress ? (
            <>
              <div className={styles["progressTrack"]}>
                <div
                  className={styles["progressFill"]}
                  style={{width: `${Math.max(0, Math.min(progress.value, 100))}%`}}
                />
              </div>
              <p className={styles["fileSize"]}>{progress.label}</p>
            </>
          ) : null}

          {error ? <p className={styles["fileError"]}>{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

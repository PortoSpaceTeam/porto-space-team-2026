"use client";

import { useState, useTransition, useOptimistic, useRef } from "react";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createTimelineItem,
  updateTimelineItem,
  deleteTimelineItem,
  reorderTimelineItems,
  type TimelineItemData,
} from "@/lib/actions/timeline";
import { apiClient } from "@/lib/api-client";
import type { FileUploadRoute } from "@/app/api/files/route";

const filesApi = apiClient<FileUploadRoute>("/api/files");

type Props = {
  initialItems: TimelineItemData[];
};

type ItemAction =
  | { type: "add"; item: TimelineItemData }
  | { type: "update"; item: TimelineItemData }
  | { type: "delete"; itemId: string }
  | { type: "reorder"; items: TimelineItemData[] };

export function TimelineManager({ initialItems }: Props) {
  const content = useIntlayer("admin-timeline-page");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState(initialItems);
  const [optimisticItems, updateOptimisticItems] = useOptimistic(
    items,
    (state: TimelineItemData[], action: ItemAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.item];
        case "update":
          return state.map((i) =>
            i.id === action.item.id ? action.item : i
          );
        case "delete":
          return state.filter((i) => i.id !== action.itemId);
        case "reorder":
          return action.items;
        default:
          return state;
      }
    }
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItemData | null>(null);
  const [deletingItem, setDeletingItem] = useState<TimelineItemData | null>(null);

  const [formData, setFormData] = useState({
    year: "",
    titleEn: "",
    titlePt: "",
    subtitleEn: "",
    subtitlePt: "",
    imageUrls: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      year: "",
      titleEn: "",
      titlePt: "",
      subtitleEn: "",
      subtitlePt: "",
      imageUrls: [],
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      toast.error(content.toast.createError.value);
      return;
    }

    setIsUploading(true);

    const uploadPromises = validFiles.map(async (file) => {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      const result = await filesApi.post({ input: formDataObj });
      if (result.success) {
        return result.data.url;
      }
      return null;
    });

    startTransition(async () => {
      const results = await Promise.all(uploadPromises);
      const newUrls = results.filter((url): url is string => url !== null);

      if (newUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          imageUrls: [...prev.imageUrls, ...newUrls],
        }));
      }

      if (newUrls.length < validFiles.length) {
        toast.error(content.toast.createError.value);
      }

      setIsUploading(false);
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const isFormValid = () => {
    const year = parseInt(formData.year, 10);
    return (
      !isNaN(year) &&
      formData.titleEn.trim() &&
      formData.titlePt.trim() &&
      formData.subtitleEn.trim() &&
      formData.subtitlePt.trim()
    );
  };

  const handleAdd = () => {
    const year = parseInt(formData.year, 10);
    if (!isFormValid()) return;

    startTransition(async () => {
      const now = new Date().toISOString();
      const tempItem: TimelineItemData = {
        id: `temp-${Date.now()}`,
        year,
        title: { en: formData.titleEn.trim(), pt: formData.titlePt.trim() },
        subtitle: { en: formData.subtitleEn.trim(), pt: formData.subtitlePt.trim() },
        imageUrls: formData.imageUrls,
        order: items.length,
        createdAt: now,
        updatedAt: now,
      };

      updateOptimisticItems({ type: "add", item: tempItem });

      const result = await createTimelineItem({
        year,
        title: { en: formData.titleEn.trim(), pt: formData.titlePt.trim() },
        subtitle: { en: formData.subtitleEn.trim(), pt: formData.subtitlePt.trim() },
        imageUrls: formData.imageUrls,
      });

      if (result.success) {
        setItems((prev) => [...prev, result.data]);
        toast.success(content.toast.createSuccess.value);
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        toast.error(content.toast.createError.value);
      }
    });
  };

  const handleUpdate = () => {
    if (!editingItem || !isFormValid()) return;

    const year = parseInt(formData.year, 10);

    startTransition(async () => {
      const updatedItem: TimelineItemData = {
        ...editingItem,
        year,
        title: { en: formData.titleEn.trim(), pt: formData.titlePt.trim() },
        subtitle: { en: formData.subtitleEn.trim(), pt: formData.subtitlePt.trim() },
        imageUrls: formData.imageUrls,
      };

      updateOptimisticItems({ type: "update", item: updatedItem });

      const result = await updateTimelineItem(editingItem.id, {
        year,
        title: { en: formData.titleEn.trim(), pt: formData.titlePt.trim() },
        subtitle: { en: formData.subtitleEn.trim(), pt: formData.subtitlePt.trim() },
        imageUrls: formData.imageUrls,
      });

      if (result.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === result.data.id ? result.data : i))
        );
        toast.success(content.toast.updateSuccess.value);
        setEditingItem(null);
        resetForm();
      } else {
        toast.error(content.toast.updateError.value);
      }
    });
  };

  const handleDelete = () => {
    if (!deletingItem) return;

    startTransition(async () => {
      updateOptimisticItems({ type: "delete", itemId: deletingItem.id });

      const result = await deleteTimelineItem(deletingItem.id);

      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
        toast.success(content.toast.deleteSuccess.value);
      } else {
        toast.error(content.toast.deleteError.value);
      }

      setDeletingItem(null);
    });
  };

  const openEditDialog = (item: TimelineItemData) => {
    setFormData({
      year: item.year.toString(),
      titleEn: item.title.en,
      titlePt: item.title.pt,
      subtitleEn: item.subtitle.en,
      subtitlePt: item.subtitle.pt,
      imageUrls: item.imageUrls,
    });
    setEditingItem(item);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newItems = [...optimisticItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const reorderedItems = newItems.map((item, i) => ({ ...item, order: i }));

    startTransition(async () => {
      updateOptimisticItems({ type: "reorder", items: reorderedItems });

      const result = await reorderTimelineItems(reorderedItems.map((i) => i.id));

      if (result.success) {
        setItems(reorderedItems);
        toast.success(content.toast.reorderSuccess.value);
      } else {
        toast.error(content.toast.reorderError.value);
      }
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === optimisticItems.length - 1) return;

    const newItems = [...optimisticItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const reorderedItems = newItems.map((item, i) => ({ ...item, order: i }));

    startTransition(async () => {
      updateOptimisticItems({ type: "reorder", items: reorderedItems });

      const result = await reorderTimelineItems(reorderedItems.map((i) => i.id));

      if (result.success) {
        setItems(reorderedItems);
        toast.success(content.toast.reorderSuccess.value);
      } else {
        toast.error(content.toast.reorderError.value);
      }
    });
  };

  const renderImageUploadSection = (id: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{content.form.imageUrls.label}</Label>
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          id={id}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          asChild
          className="w-full"
        >
          <label htmlFor={id} className="cursor-pointer flex items-center justify-center gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {content.form.uploading}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {content.form.uploadImages}
              </>
            )}
          </label>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {content.form.imageUrls.description}
      </p>
      {formData.imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.imageUrls.map((url, index) => (
            <div key={url} className="relative">
              <div className="relative h-20 w-28 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={url}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5"
                onClick={() => handleRemoveImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLocalizedFormFields = (idPrefix: string) => (
    <Tabs defaultValue="en" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="en">{content.form.languages.english}</TabsTrigger>
        <TabsTrigger value="pt">{content.form.languages.portuguese}</TabsTrigger>
      </TabsList>
      <TabsContent value="en" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title-en`}>{content.form.title.label}</Label>
          <Input
            id={`${idPrefix}-title-en`}
            value={formData.titleEn}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, titleEn: e.target.value }))
            }
            placeholder={content.form.title.placeholderEn.value}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-subtitle-en`}>{content.form.subtitle.label}</Label>
          <Textarea
            id={`${idPrefix}-subtitle-en`}
            value={formData.subtitleEn}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, subtitleEn: e.target.value }))
            }
            placeholder={content.form.subtitle.placeholderEn.value}
          />
        </div>
      </TabsContent>
      <TabsContent value="pt" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title-pt`}>{content.form.title.label}</Label>
          <Input
            id={`${idPrefix}-title-pt`}
            value={formData.titlePt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, titlePt: e.target.value }))
            }
            placeholder={content.form.title.placeholderPt.value}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-subtitle-pt`}>{content.form.subtitle.label}</Label>
          <Textarea
            id={`${idPrefix}-subtitle-pt`}
            value={formData.subtitlePt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, subtitlePt: e.target.value }))
            }
            placeholder={content.form.subtitle.placeholderPt.value}
          />
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-6">
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()}>
            <Plus className="mr-2 h-4 w-4" />
            {content.addButton}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{content.dialog.addTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">{content.form.year.label}</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, year: e.target.value }))
                }
                placeholder={content.form.year.placeholder.value}
              />
            </div>
            {renderLocalizedFormFields("add")}
            {renderImageUploadSection("add-images")}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
              {content.form.cancel}
            </Button>
            <Button onClick={handleAdd} disabled={isPending || !isFormValid()}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {content.form.saving}
                </>
              ) : (
                content.form.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{content.dialog.editTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-year">{content.form.year.label}</Label>
              <Input
                id="edit-year"
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, year: e.target.value }))
                }
                placeholder={content.form.year.placeholder.value}
              />
            </div>
            {renderLocalizedFormFields("edit")}
            {renderImageUploadSection("edit-images")}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              {content.form.cancel}
            </Button>
            <Button onClick={handleUpdate} disabled={isPending || !isFormValid()}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {content.form.saving}
                </>
              ) : (
                content.form.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{content.dialog.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {content.dialog.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{content.form.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {content.form.deleting}
                </>
              ) : (
                content.form.delete
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {optimisticItems.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{content.emptyState.title}</CardTitle>
            <CardDescription>{content.emptyState.description}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {optimisticItems.map((item, index) => (
            <Card key={item.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 sm:gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || isPending}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === optimisticItems.length - 1 || isPending}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  {item.imageUrls.length > 0 && (
                    <div className="hidden sm:flex gap-1 shrink-0">
                      {item.imageUrls.slice(0, 2).map((url, imgIndex) => (
                        <div
                          key={url}
                          className="relative h-20 w-28 overflow-hidden rounded border"
                        >
                          <Image
                            src={url}
                            alt={`${item.title.en} - ${imgIndex + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                      {item.imageUrls.length > 2 && (
                        <div className="flex h-20 w-10 items-center justify-center rounded border bg-muted text-sm text-muted-foreground">
                          +{item.imageUrls.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="inline-block px-2 py-0.5 text-xs font-mono text-primary bg-primary/10 rounded mb-2">
                      {item.year}
                    </div>
                    <h3 className="font-semibold truncate">{item.title.en}</h3>
                    <p className="text-xs text-muted-foreground truncate mb-1">{item.title.pt}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.subtitle.en}
                    </p>
                  </div>
                  <div className="flex gap-1 sm:gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingItem(item)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useIntlayer } from "next-intlayer";
import { useState, type TransitionStartFunction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import type {
  SponsorCategoryItem,
  SponsorItem,
  CategoryTitleStyle,
} from "@/lib/actions/sponsors";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/lib/actions/sponsors";

type CategoryAction =
  | { type: "add"; category: SponsorCategoryItem }
  | { type: "update"; category: SponsorCategoryItem }
  | { type: "delete"; categoryId: string }
  | { type: "reorder"; categories: SponsorCategoryItem[] };

interface CategoriesListProps {
  categories: SponsorCategoryItem[];
  sponsors: SponsorItem[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  updateOptimistic: (action: CategoryAction) => void;
  onAdd: (category: SponsorCategoryItem) => void;
  onUpdate: (category: SponsorCategoryItem) => void;
  onDelete: (categoryId: string) => void;
  onReorder: (categories: SponsorCategoryItem[]) => void;
}

const FONT_WEIGHTS = [
  { value: "400", label: "normal" },
  { value: "500", label: "medium" },
  { value: "600", label: "semibold" },
  { value: "700", label: "bold" },
  { value: "800", label: "extrabold" },
] as const;

type FontWeightKey = (typeof FONT_WEIGHTS)[number]["label"];

export function CategoriesList({
  categories,
  sponsors,
  isPending,
  startTransition,
  updateOptimistic,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: CategoriesListProps) {
  const content = useIntlayer("admin-sponsors-page");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<SponsorCategoryItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] =
    useState<SponsorCategoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    titleStyle: {
      fontSize: "2rem",
      fontWeight: "700",
      colorLight: "#0a0a0a",
      colorDark: "#fafafa",
    } as CategoryTitleStyle,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      titleStyle: {
        fontSize: "2rem",
        fontWeight: "700",
        colorLight: "#0a0a0a",
        colorDark: "#fafafa",
      },
    });
    setEditingCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (category: SponsorCategoryItem) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      titleStyle: { ...category.titleStyle },
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);

    if (editingCategory) {
      startTransition(async () => {
        const tempCategory = {
          ...editingCategory,
          name: formData.name,
          titleStyle: formData.titleStyle,
        };
        updateOptimistic({ type: "update", category: tempCategory });

        const result = await updateCategory(editingCategory.id, {
          name: formData.name,
          titleStyle: formData.titleStyle,
        });

        if (result.success) {
          onUpdate(result.data);
          toast.success(content.toast.categoryUpdated.value);
          setDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.error);
        }
        setIsSubmitting(false);
      });
    } else {
      startTransition(async () => {
        const result = await createCategory({
          name: formData.name,
          titleStyle: formData.titleStyle,
        });

        if (result.success) {
          onAdd(result.data);
          toast.success(content.toast.categoryCreated.value);
          setDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.error);
        }
        setIsSubmitting(false);
      });
    }
  };

  const handleDelete = () => {
    if (!categoryToDelete) return;

    const categoryId = categoryToDelete.id;
    const sponsorsInCategory = sponsors.filter(
      (s) => s.categoryId === categoryId
    );

    if (sponsorsInCategory.length > 0) {
      toast.error(content.toast.categoryHasSponsors.value);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      return;
    }

    setDeleteDialogOpen(false);

    startTransition(async () => {
      updateOptimistic({ type: "delete", categoryId });

      const result = await deleteCategory(categoryId);

      if (result.success) {
        onDelete(categoryId);
        toast.success(content.toast.categoryDeleted.value);
      } else {
        toast.error(result.error);
      }
      setCategoryToDelete(null);
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newCategories = [...categories];
    const [draggedItem] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(dragOverIndex, 0, draggedItem);

    const reorderedCategories = newCategories.map((cat, i) => ({
      ...cat,
      order: i,
    }));

    const categoryIds = reorderedCategories.map((c) => c.id);

    setDraggedIndex(null);
    setDragOverIndex(null);

    startTransition(async () => {
      updateOptimistic({ type: "reorder", categories: reorderedCategories });

      const result = await reorderCategories(categoryIds);

      if (result.success) {
        onReorder(reorderedCategories);
        toast.success(content.toast.reorderSuccess.value);
      } else {
        toast.error(result.error);
      }
    });
  };

  const getSponsorCount = (categoryId: string) =>
    sponsors.filter((s) => s.categoryId === categoryId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{content.categories.title}</h2>
          <p className="text-sm text-muted-foreground">
            {content.categories.description}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          {content.categories.addCategory}
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{content.categories.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {content.categories.dragHint}
          </p>
          <div className="space-y-2">
            {categories.map((category, index) => (
              <Card
                key={category.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`cursor-move transition-all ${
                  isPending ? "opacity-70" : ""
                } ${draggedIndex === index ? "opacity-50 scale-95" : ""} ${
                  dragOverIndex === index && draggedIndex !== index
                    ? "border-primary border-2"
                    : ""
                }`}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center gap-3">
                    <GripVertical className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 min-w-0">
                        <span
                          style={{
                            fontSize: category.titleStyle.fontSize,
                            fontWeight: category.titleStyle.fontWeight,
                            color: category.titleStyle.colorLight,
                          }}
                          className="text-sm dark:hidden"
                        >
                          {category.name}
                        </span>
                        <span
                          style={{
                            fontSize: category.titleStyle.fontSize,
                            fontWeight: category.titleStyle.fontWeight,
                            color: category.titleStyle.colorDark,
                          }}
                          className="text-sm hidden dark:inline"
                        >
                          {category.name}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          ({getSponsorCount(category.id)})
                        </span>
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="size-4" />
                          {content.actions.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setCategoryToDelete(category);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                          {content.actions.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? content.actions.edit
                : content.categories.addCategory}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{content.form.name}</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={content.form.namePlaceholder.value}
              />
            </div>
            <div className="space-y-2">
              <Label>{content.form.titleStyle}</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{content.form.fontSize}</Label>
                  <Input
                    value={formData.titleStyle.fontSize}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        titleStyle: {
                          ...prev.titleStyle,
                          fontSize: e.target.value,
                        },
                      }))
                    }
                    placeholder="2rem"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{content.form.fontWeight}</Label>
                  <Select
                    value={formData.titleStyle.fontWeight}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        titleStyle: { ...prev.titleStyle, fontWeight: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map((fw) => (
                        <SelectItem key={fw.value} value={fw.value}>
                          {content.fontWeights[fw.label as FontWeightKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{content.form.colorLight}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.titleStyle.colorLight}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          titleStyle: {
                            ...prev.titleStyle,
                            colorLight: e.target.value,
                          },
                        }))
                      }
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.titleStyle.colorLight}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          titleStyle: {
                            ...prev.titleStyle,
                            colorLight: e.target.value,
                          },
                        }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{content.form.colorDark}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.titleStyle.colorDark}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          titleStyle: {
                            ...prev.titleStyle,
                            colorDark: e.target.value,
                          },
                        }))
                      }
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.titleStyle.colorDark}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          titleStyle: {
                            ...prev.titleStyle,
                            colorDark: e.target.value,
                          },
                        }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{content.form.preview}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border p-3 bg-white">
                  <span
                    style={{
                      fontSize: formData.titleStyle.fontSize,
                      fontWeight: formData.titleStyle.fontWeight,
                      color: formData.titleStyle.colorLight,
                    }}
                  >
                    {formData.name || "Category Name"}
                  </span>
                </div>
                <div className="rounded-md border p-3 bg-zinc-900">
                  <span
                    style={{
                      fontSize: formData.titleStyle.fontSize,
                      fontWeight: formData.titleStyle.fontWeight,
                      color: formData.titleStyle.colorDark,
                    }}
                  >
                    {formData.name || "Category Name"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              {content.form.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingCategory ? content.form.save : content.form.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {content.confirmDelete.categoryTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {content.confirmDelete.categoryDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{content.confirmDelete.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {content.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

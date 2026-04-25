"use client";

import { useIntlayer } from "next-intlayer";
import { useState, useTransition, useOptimistic, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  X,
} from "lucide-react";
import type { DepartmentItem } from "@/lib/actions/departments";
import type { LocalizedString } from "@/models/Department";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  reorderDepartments,
} from "@/lib/actions/departments";

interface DepartmentsManagerProps {
  initialDepartments: DepartmentItem[];
}

type DepartmentAction =
  | { type: "add"; department: DepartmentItem }
  | { type: "update"; department: DepartmentItem }
  | { type: "delete"; departmentId: string }
  | { type: "reorder"; departments: DepartmentItem[] };

const emptyLocalizedString: LocalizedString = { en: "", pt: "" };

export function DepartmentsManager({
  initialDepartments,
}: DepartmentsManagerProps) {
  const content = useIntlayer("admin-departments-page");
  const [isPending, startTransition] = useTransition();

  const [departments, setDepartments] = useState(initialDepartments);

  const [optimisticDepartments, updateOptimisticDepartments] = useOptimistic(
    departments,
    (state: DepartmentItem[], action: DepartmentAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.department];
        case "update":
          return state.map((d) =>
            d.id === action.department.id ? action.department : d
          );
        case "delete":
          return state.filter((d) => d.id !== action.departmentId);
        case "reorder":
          return action.departments;
        default:
          return state;
      }
    }
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentItem | null>(null);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<DepartmentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: { ...emptyLocalizedString },
    skills: [] as LocalizedString[],
  });

  const [newSkill, setNewSkill] = useState({ ...emptyLocalizedString });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: { ...emptyLocalizedString },
      skills: [],
    });
    setNewSkill({ ...emptyLocalizedString });
    setEditingDepartment(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (department: DepartmentItem) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description ?? { ...emptyLocalizedString },
      skills: department.skills ?? [],
    });
    setNewSkill({ ...emptyLocalizedString });
    setDialogOpen(true);
  };

  const handleAdd = useCallback((department: DepartmentItem) => {
    setDepartments((prev) => [...prev, department]);
  }, []);

  const handleUpdate = useCallback((department: DepartmentItem) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === department.id ? department : d))
    );
  }, []);

  const handleDelete = useCallback((departmentId: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
  }, []);

  const handleReorder = useCallback((newDepartments: DepartmentItem[]) => {
    setDepartments(newDepartments);
  }, []);

  const addSkill = () => {
    if (!newSkill.en.trim() && !newSkill.pt.trim()) return;
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { ...newSkill }],
    }));
    setNewSkill({ ...emptyLocalizedString });
  };

  const removeSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return;

    setIsSubmitting(true);

    if (editingDepartment) {
      startTransition(async () => {
        const tempDepartment = {
          ...editingDepartment,
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description,
          skills: formData.skills,
        };
        updateOptimisticDepartments({ type: "update", department: tempDepartment });

        const result = await updateDepartment(editingDepartment.id, {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          skills: formData.skills,
        });

        if (result.success) {
          handleUpdate(result.data);
          toast.success(content.toast.updated.value);
          setDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.error);
        }
        setIsSubmitting(false);
      });
    } else {
      startTransition(async () => {
        const result = await createDepartment({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          skills: formData.skills,
        });

        if (result.success) {
          handleAdd(result.data);
          toast.success(content.toast.created.value);
          setDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.error);
        }
        setIsSubmitting(false);
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!departmentToDelete) return;

    const departmentId = departmentToDelete.id;
    setDeleteDialogOpen(false);

    startTransition(async () => {
      updateOptimisticDepartments({ type: "delete", departmentId });

      const result = await deleteDepartment(departmentId);

      if (result.success) {
        handleDelete(departmentId);
        toast.success(content.toast.deleted.value);
      } else {
        toast.error(result.error);
      }
      setDepartmentToDelete(null);
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
    if (
      draggedIndex === null ||
      dragOverIndex === null ||
      draggedIndex === dragOverIndex
    ) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newDepartments = [...departments];
    const [draggedItem] = newDepartments.splice(draggedIndex, 1);
    newDepartments.splice(dragOverIndex, 0, draggedItem);

    const reorderedDepartments = newDepartments.map((dept, i) => ({
      ...dept,
      order: i,
    }));

    const departmentIds = reorderedDepartments.map((d) => d.id);

    setDraggedIndex(null);
    setDragOverIndex(null);

    startTransition(async () => {
      updateOptimisticDepartments({
        type: "reorder",
        departments: reorderedDepartments,
      });

      const result = await reorderDepartments(departmentIds);

      if (result.success) {
        handleReorder(reorderedDepartments);
        toast.success(content.toast.reordered.value);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{content.list.title}</h2>
          <p className="text-sm text-muted-foreground">
            {content.list.description}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          {content.actions.add}
        </Button>
      </div>

      {optimisticDepartments.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{content.list.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{content.list.dragHint}</p>
          <div className="space-y-2">
            {optimisticDepartments.map((department, index) => (
              <Card
                key={department.id}
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
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded shrink-0">
                        {department.code}
                      </span>
                      <span className="font-medium truncate">{department.name}</span>
                      {department.skills && department.skills.length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {department.skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill.en || skill.pt}
                            </Badge>
                          ))}
                          {department.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{department.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(department)}
                        >
                          <Pencil className="size-4" />
                          {content.actions.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setDepartmentToDelete(department);
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
        <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? content.dialog.editTitle : content.dialog.addTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
                <Label>{content.form.code}</Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={content.form.codePlaceholder.value}
                  maxLength={5}
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  {content.form.codeDescription}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{content.form.description}</Label>
              <Tabs defaultValue="en" className="w-full">
                <TabsList className="mb-2">
                  <TabsTrigger value="en">{content.form.english}</TabsTrigger>
                  <TabsTrigger value="pt">{content.form.portuguese}</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <Textarea
                    value={formData.description.en}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: { ...prev.description, en: e.target.value },
                      }))
                    }
                    placeholder={content.form.descriptionPlaceholder.value}
                    rows={3}
                  />
                </TabsContent>
                <TabsContent value="pt">
                  <Textarea
                    value={formData.description.pt}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: { ...prev.description, pt: e.target.value },
                      }))
                    }
                    placeholder={content.form.descriptionPlaceholder.value}
                    rows={3}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label>{content.form.skills}</Label>
              <p className="text-xs text-muted-foreground">
                {content.form.skillsDescription}
              </p>

              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 py-2">
                  {formData.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <span>{skill.en || skill.pt}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="border rounded-md p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {content.form.english}
                    </Label>
                    <Input
                      value={newSkill.en}
                      onChange={(e) =>
                        setNewSkill((prev) => ({ ...prev, en: e.target.value }))
                      }
                      placeholder={content.form.skillPlaceholder.value}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {content.form.portuguese}
                    </Label>
                    <Input
                      value={newSkill.pt}
                      onChange={(e) =>
                        setNewSkill((prev) => ({ ...prev, pt: e.target.value }))
                      }
                      placeholder={content.form.skillPlaceholder.value}
                      className="h-8"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSkill}
                  disabled={!newSkill.en.trim() && !newSkill.pt.trim()}
                >
                  <Plus className="size-3" />
                  {content.form.addSkill}
                </Button>
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
              disabled={!formData.name.trim() || !formData.code.trim() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingDepartment ? content.form.save : content.form.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{content.confirmDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {content.confirmDelete.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{content.confirmDelete.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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

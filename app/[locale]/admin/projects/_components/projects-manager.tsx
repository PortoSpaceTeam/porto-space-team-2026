"use client";

import { useState, useTransition, useOptimistic, useRef } from "react";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Upload,
  X,
  Eye,
  EyeOff,
  FileEdit,
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/components/locale/link";
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
import { Badge } from "@/components/ui/badge";
import {
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
  toggleProjectVisibility,
  type ProjectData,
} from "@/lib/actions/projects";
import { apiClient } from "@/lib/api-client";
import type { FileUploadRoute } from "@/app/api/files/route";

const filesApi = apiClient<FileUploadRoute>("/api/files");

type Props = {
  initialProjects: ProjectData[];
};

type ProjectAction =
  | { type: "add"; project: ProjectData }
  | { type: "update"; project: ProjectData }
  | { type: "delete"; projectId: string }
  | { type: "reorder"; projects: ProjectData[] }
  | { type: "toggleVisibility"; projectId: string };

export function ProjectsManager({ initialProjects }: Props) {
  const content = useIntlayer("admin-projects-page");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState(initialProjects);
  const [optimisticProjects, updateOptimisticProjects] = useOptimistic(
    projects,
    (state: ProjectData[], action: ProjectAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.project];
        case "update":
          return state.map((p) =>
            p.id === action.project.id ? action.project : p
          );
        case "delete":
          return state.filter((p) => p.id !== action.projectId);
        case "reorder":
          return action.projects;
        case "toggleVisibility":
          return state.map((p) =>
            p.id === action.projectId ? { ...p, visible: !p.visible } : p
          );
        default:
          return state;
      }
    }
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(
    null
  );
  const [deletingProject, setDeletingProject] = useState<ProjectData | null>(
    null
  );

  const [formData, setFormData] = useState({
    nameEn: "",
    namePt: "",
    descriptionEn: "",
    descriptionPt: "",
    logo: "",
  });

  const resetForm = () => {
    setFormData({
      nameEn: "",
      namePt: "",
      descriptionEn: "",
      descriptionPt: "",
      logo: "",
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error(content.toast.createError.value);
      return;
    }

    setIsUploading(true);

    startTransition(async () => {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      const result = await filesApi.post({ input: formDataObj });

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          logo: result.data.url,
        }));
      } else {
        toast.error(content.toast.createError.value);
      }

      setIsUploading(false);
    });
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo: "",
    }));
  };

  const isFormValid = () => {
    return (
      formData.nameEn.trim() &&
      formData.namePt.trim() &&
      formData.descriptionEn.trim() &&
      formData.descriptionPt.trim() &&
      formData.logo
    );
  };

  const handleAdd = () => {
    if (!isFormValid()) return;

    startTransition(async () => {
      const now = new Date().toISOString();
      const tempSlug = formData.nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const tempProject: ProjectData = {
        id: `temp-${Date.now()}`,
        name: { en: formData.nameEn.trim(), pt: formData.namePt.trim() },
        slug: tempSlug,
        description: {
          en: formData.descriptionEn.trim(),
          pt: formData.descriptionPt.trim(),
        },
        logo: formData.logo,
        order: projects.length,
        visible: true,
        heroDescription: { en: "", pt: "" },
        stats: [],
        projectImage: "",
        projectImageAlt: { en: "", pt: "" },
        departments: [],
        media: [],
        customSections: [],
        createdAt: now,
        updatedAt: now,
      };

      updateOptimisticProjects({ type: "add", project: tempProject });

      const result = await createProject({
        name: { en: formData.nameEn.trim(), pt: formData.namePt.trim() },
        description: {
          en: formData.descriptionEn.trim(),
          pt: formData.descriptionPt.trim(),
        },
        logo: formData.logo,
      });

      if (result.success) {
        setProjects((prev) => [...prev, result.data]);
        toast.success(content.toast.createSuccess.value);
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        toast.error(content.toast.createError.value);
      }
    });
  };

  const handleUpdate = () => {
    if (!editingProject || !isFormValid()) return;

    startTransition(async () => {
      const updatedProject: ProjectData = {
        ...editingProject,
        name: { en: formData.nameEn.trim(), pt: formData.namePt.trim() },
        description: {
          en: formData.descriptionEn.trim(),
          pt: formData.descriptionPt.trim(),
        },
        logo: formData.logo,
      };

      updateOptimisticProjects({ type: "update", project: updatedProject });

      const result = await updateProject(editingProject.id, {
        name: { en: formData.nameEn.trim(), pt: formData.namePt.trim() },
        description: {
          en: formData.descriptionEn.trim(),
          pt: formData.descriptionPt.trim(),
        },
        logo: formData.logo,
      });

      if (result.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === result.data.id ? result.data : p))
        );
        toast.success(content.toast.updateSuccess.value);
        setEditingProject(null);
        resetForm();
      } else {
        toast.error(content.toast.updateError.value);
      }
    });
  };

  const handleDelete = () => {
    if (!deletingProject) return;

    startTransition(async () => {
      updateOptimisticProjects({
        type: "delete",
        projectId: deletingProject.id,
      });

      const result = await deleteProject(deletingProject.id);

      if (result.success) {
        setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
        toast.success(content.toast.deleteSuccess.value);
      } else {
        toast.error(content.toast.deleteError.value);
      }

      setDeletingProject(null);
    });
  };

  const handleToggleVisibility = (project: ProjectData) => {
    startTransition(async () => {
      updateOptimisticProjects({
        type: "toggleVisibility",
        projectId: project.id,
      });

      const result = await toggleProjectVisibility(project.id);

      if (result.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === result.data.id ? result.data : p))
        );
        toast.success(content.toast.visibilitySuccess.value);
      } else {
        toast.error(content.toast.visibilityError.value);
      }
    });
  };

  const openEditDialog = (project: ProjectData) => {
    setFormData({
      nameEn: project.name.en,
      namePt: project.name.pt,
      descriptionEn: project.description.en,
      descriptionPt: project.description.pt,
      logo: project.logo,
    });
    setEditingProject(project);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newProjects = [...optimisticProjects];
    [newProjects[index - 1], newProjects[index]] = [
      newProjects[index],
      newProjects[index - 1],
    ];
    const reorderedProjects = newProjects.map((project, i) => ({
      ...project,
      order: i,
    }));

    startTransition(async () => {
      updateOptimisticProjects({ type: "reorder", projects: reorderedProjects });

      const result = await reorderProjects(reorderedProjects.map((p) => p.id));

      if (result.success) {
        setProjects(reorderedProjects);
        toast.success(content.toast.reorderSuccess.value);
      } else {
        toast.error(content.toast.reorderError.value);
      }
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === optimisticProjects.length - 1) return;

    const newProjects = [...optimisticProjects];
    [newProjects[index], newProjects[index + 1]] = [
      newProjects[index + 1],
      newProjects[index],
    ];
    const reorderedProjects = newProjects.map((project, i) => ({
      ...project,
      order: i,
    }));

    startTransition(async () => {
      updateOptimisticProjects({ type: "reorder", projects: reorderedProjects });

      const result = await reorderProjects(reorderedProjects.map((p) => p.id));

      if (result.success) {
        setProjects(reorderedProjects);
        toast.success(content.toast.reorderSuccess.value);
      } else {
        toast.error(content.toast.reorderError.value);
      }
    });
  };

  const renderLogoUploadSection = (id: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{content.form.logo.label}</Label>
      {formData.logo ? (
        <div className="relative inline-block">
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border bg-muted">
            <Image
              src={formData.logo}
              alt="Project logo"
              fill
              className="object-contain p-2"
              sizes="96px"
              unoptimized
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemoveLogo}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
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
            <label
              htmlFor={id}
              className="cursor-pointer flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {content.form.uploading}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {content.form.uploadLogo}
                </>
              )}
            </label>
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {content.form.logo.description}
      </p>
    </div>
  );

  const renderLocalizedFormFields = (idPrefix: string) => (
    <Tabs defaultValue="en" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="en">{content.form.languages.english}</TabsTrigger>
        <TabsTrigger value="pt">
          {content.form.languages.portuguese}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="en" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name-en`}>
            {content.form.name.label}
          </Label>
          <Input
            id={`${idPrefix}-name-en`}
            value={formData.nameEn}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, nameEn: e.target.value }))
            }
            placeholder={content.form.name.placeholderEn.value}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-description-en`}>
            {content.form.description.label}
          </Label>
          <Textarea
            id={`${idPrefix}-description-en`}
            value={formData.descriptionEn}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                descriptionEn: e.target.value,
              }))
            }
            placeholder={content.form.description.placeholderEn.value}
          />
        </div>
      </TabsContent>
      <TabsContent value="pt" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name-pt`}>
            {content.form.name.label}
          </Label>
          <Input
            id={`${idPrefix}-name-pt`}
            value={formData.namePt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, namePt: e.target.value }))
            }
            placeholder={content.form.name.placeholderPt.value}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-description-pt`}>
            {content.form.description.label}
          </Label>
          <Textarea
            id={`${idPrefix}-description-pt`}
            value={formData.descriptionPt}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                descriptionPt: e.target.value,
              }))
            }
            placeholder={content.form.description.placeholderPt.value}
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
            {renderLogoUploadSection("add-logo")}
            {renderLocalizedFormFields("add")}
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
        open={!!editingProject}
        onOpenChange={(open: boolean) => !open && setEditingProject(null)}
      >
        <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{content.dialog.editTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {renderLogoUploadSection("edit-logo")}
            {renderLocalizedFormFields("edit")}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              {content.form.cancel}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isPending || !isFormValid()}
            >
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
        open={!!deletingProject}
        onOpenChange={(open: boolean) => !open && setDeletingProject(null)}
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

      {optimisticProjects.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{content.emptyState.title}</CardTitle>
            <CardDescription>{content.emptyState.description}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {optimisticProjects.map((project, index) => (
            <Card key={project.id} className="relative">
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
                      disabled={
                        index === optimisticProjects.length - 1 || isPending
                      }
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  {project.logo && (
                    <div className="hidden sm:block shrink-0">
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={project.logo}
                          alt={project.name.en}
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {project.name.en}
                      </h3>
                      <Badge
                        variant={project.visible ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {project.visible
                          ? content.visibility.visible
                          : content.visibility.hidden}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {project.name.pt}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description.en}
                    </p>
                  </div>
                  <div className="flex gap-1 sm:gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleVisibility(project)}
                      disabled={isPending}
                      title={String(
                        project.visible
                          ? content.visibility.hidden
                          : content.visibility.visible
                      )}
                    >
                      {project.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Edit Content"
                    >
                      <Link href={`/admin/projects/${project.slug}`}>
                        <FileEdit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(project)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingProject(project)}
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

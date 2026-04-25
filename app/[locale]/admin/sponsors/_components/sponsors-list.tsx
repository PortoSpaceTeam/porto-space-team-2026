"use client";

import { useIntlayer } from "next-intlayer";
import { useState, useRef, type TransitionStartFunction } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  ImageIcon,
  Upload,
} from "lucide-react";
import type { SponsorCategoryItem, SponsorItem } from "@/lib/actions/sponsors";
import type { ProjectData } from "@/lib/actions/projects";
import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
} from "@/lib/actions/sponsors";
import { apiClient } from "@/lib/api-client";
import type { FileUploadRoute } from "@/app/api/files/route";

const filesApi = apiClient<FileUploadRoute>("/api/files");

type SponsorAction =
  | { type: "add"; sponsor: SponsorItem }
  | { type: "update"; sponsor: SponsorItem }
  | { type: "delete"; sponsorId: string }
  | { type: "reorder"; sponsors: SponsorItem[] };

interface SponsorsListProps {
  categories: SponsorCategoryItem[];
  sponsors: SponsorItem[];
  projects: ProjectData[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  updateOptimistic: (action: SponsorAction) => void;
  onAdd: (sponsor: SponsorItem) => void;
  onUpdate: (sponsor: SponsorItem) => void;
  onDelete: (sponsorId: string) => void;
  onReorder: (sponsors: SponsorItem[]) => void;
}

export function SponsorsList({
  categories,
  sponsors,
  projects,
  isPending,
  startTransition,
  updateOptimistic,
  onAdd,
  onUpdate,
  onDelete,
}: SponsorsListProps) {
  const content = useIntlayer("admin-sponsors-page");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsorItem | null>(
    null
  );
  const [sponsorToDelete, setSponsorToDelete] = useState<SponsorItem | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    link: "",
    imageUrl: "",
    description: "",
    projectId: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      categoryId: categories[0]?.id ?? "",
      link: "",
      imageUrl: "",
      description: "",
      projectId: "",
    });
    setEditingSponsor(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file.type.startsWith("image/")) {
      toast.error(content.toast.error.value);
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await filesApi.post({ input: formData });

      if (result.success) {
        setFormData((prev) => ({ ...prev, imageUrl: result.data.url }));
      } else {
        toast.error(result.error.message);
      }
      setIsUploading(false);
    });
  };

  const openEditDialog = (sponsor: SponsorItem) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      categoryId: sponsor.categoryId,
      link: sponsor.link,
      imageUrl: sponsor.imageUrl,
      description: sponsor.description,
      projectId: sponsor.project?.slug ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (
      !formData.name.trim() ||
      !formData.categoryId ||
      !formData.link.trim() ||
      !formData.imageUrl.trim()
    ) {
      return;
    }

    setIsSubmitting(true);

    if (editingSponsor) {
      startTransition(async () => {
        const tempSponsor: SponsorItem = {
          ...editingSponsor,
          name: formData.name,
          categoryId: formData.categoryId,
          link: formData.link,
          imageUrl: formData.imageUrl,
          description: formData.description,
        };
        updateOptimistic({ type: "update", sponsor: tempSponsor });

        const result = await updateSponsor(editingSponsor.id, {
          name: formData.name,
          categoryId: formData.categoryId,
          link: formData.link,
          imageUrl: formData.imageUrl,
          description: formData.description,
          projectId: formData.projectId || undefined,
        });

        if (result.success) {
          onUpdate(result.data);
          toast.success(content.toast.sponsorUpdated.value);
          setDialogOpen(false);
          resetForm();
        } else {
          toast.error(result.error);
        }
        setIsSubmitting(false);
      });
    } else {
      startTransition(async () => {
        const result = await createSponsor({
          name: formData.name,
          categoryId: formData.categoryId,
          link: formData.link,
          imageUrl: formData.imageUrl,
          description: formData.description,
          projectId: formData.projectId || undefined,
        });

        if (result.success) {
          onAdd(result.data);
          toast.success(content.toast.sponsorCreated.value);
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
    if (!sponsorToDelete) return;

    const sponsorId = sponsorToDelete.id;
    setDeleteDialogOpen(false);

    startTransition(async () => {
      updateOptimistic({ type: "delete", sponsorId });

      const result = await deleteSponsor(sponsorId);

      if (result.success) {
        onDelete(sponsorId);
        toast.success(content.toast.sponsorDeleted.value);
      } else {
        toast.error(result.error);
      }
      setSponsorToDelete(null);
    });
  };

  const filteredSponsors =
    filterCategory === "all"
      ? sponsors
      : sponsors.filter((s) => s.categoryId === filterCategory);

  const groupedSponsors = categories.map((category) => ({
    category,
    sponsors: filteredSponsors
      .filter((s) => s.categoryId === category.id)
      .sort((a, b) => a.order - b.order),
  }));

  const hasSponsors = sponsors.length > 0;
  const hasCategories = categories.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{content.sponsors.title}</h2>
          <p className="text-sm text-muted-foreground">
            {content.sponsors.description}
          </p>
        </div>
        <Button onClick={openCreateDialog} disabled={!hasCategories}>
          <Plus className="size-4" />
          {content.sponsors.addSponsor}
        </Button>
      </div>

      {!hasCategories ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {content.sponsors.noCategoriesHint}
            </p>
          </CardContent>
        </Card>
      ) : !hasSponsors ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{content.sponsors.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              {content.sponsors.filterByCategory}:
            </Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {content.sponsors.allCategories}
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-6">
            {groupedSponsors
              .filter((g) => g.sponsors.length > 0)
              .map(({ category, sponsors: categorySponsors }) => (
                <div key={category.id} className="space-y-3">
                  <h3
                    className="font-semibold dark:hidden"
                    style={{
                      color: category.titleStyle.colorLight,
                    }}
                  >
                    {category.name}
                  </h3>
                  <h3
                    className="font-semibold hidden dark:block"
                    style={{
                      color: category.titleStyle.colorDark,
                    }}
                  >
                    {category.name}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categorySponsors.map((sponsor) => (
                      <Card
                        key={sponsor.id}
                        className={`transition-opacity ${
                          isPending ? "opacity-70" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                              {sponsor.imageUrl ? (
                                <Image
                                  src={sponsor.imageUrl}
                                  alt={sponsor.name}
                                  fill
                                  className="object-contain"
                                  sizes="64px"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center">
                                  <ImageIcon className="size-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm truncate">
                                  {sponsor.name}
                                </h4>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="shrink-0"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => openEditDialog(sponsor)}
                                    >
                                      <Pencil className="size-4" />
                                      {content.actions.edit}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={sponsor.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="size-4" />
                                        {content.actions.viewSite}
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        setSponsorToDelete(sponsor);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="size-4" />
                                      {content.actions.delete}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              {sponsor.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {sponsor.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingSponsor
                ? content.actions.edit
                : content.sponsors.addSponsor}
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
              <Label>{content.form.category}</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, categoryId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={content.form.selectCategory.value} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{content.form.link}</Label>
              <Input
                value={formData.link}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, link: e.target.value }))
                }
                placeholder={content.form.linkPlaceholder.value}
              />
            </div>
            <div className="space-y-2">
              <Label>{content.form.image}</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder={content.form.imagePlaceholder.value}
                  className="flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="sponsor-image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isUploading}
                  asChild
                >
                  <label htmlFor="sponsor-image-upload" className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                  </label>
                </Button>
              </div>
              {formData.imageUrl && (
                <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={formData.imageUrl}
                    alt="Preview"
                    fill
                    className="object-contain"
                    sizes="80px"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{content.form.description}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={content.form.descriptionPlaceholder.value}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{content.form.project}</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, projectId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={content.form.selectProject.value} />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="none">
                    {content.form.noProject}
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.slug} value={project.slug}>
                      {project.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={
                !formData.name.trim() ||
                !formData.categoryId ||
                !formData.link.trim() ||
                !formData.imageUrl.trim() ||
                isSubmitting
              }
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingSponsor ? content.form.save : content.form.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {content.confirmDelete.sponsorTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {content.confirmDelete.sponsorDescription}
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

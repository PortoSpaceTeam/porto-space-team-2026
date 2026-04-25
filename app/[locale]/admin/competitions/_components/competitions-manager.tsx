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
  Type,
  Image as ImageIcon,
  Images,
  Columns,
  BarChart3,
  Clock,
  Frame,
  MousePointerClick,
  Space,
  GripVertical,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createCompetitionSection,
  updateCompetitionSection,
  deleteCompetitionSection,
  reorderCompetitionSections,
  toggleSectionVisibility,
  type CompetitionSectionData,
} from "@/lib/actions/competitions";
import type {
  SectionType,
  SectionContent,
  ContentBlock,
  ContentBlockType,
  TextBlockData,
  ImageBlockData,
  ImageFrameBlockData,
  CarouselBlockData,
  ButtonBlockData,
  SpacerBlockData,
  StatItem,
  TimelineItem,
} from "@/models/CompetitionSection";
import { apiClient } from "@/lib/api-client";
import type { FileUploadRoute } from "@/app/api/files/route";
import { SectionsPreview } from "./sections-preview";

const filesApi = apiClient<FileUploadRoute>("/api/files");

type Props = {
  initialSections: CompetitionSectionData[];
};

type SectionAction =
  | { type: "add"; section: CompetitionSectionData }
  | { type: "update"; section: CompetitionSectionData }
  | { type: "delete"; sectionId: string }
  | { type: "reorder"; sections: CompetitionSectionData[] };

const SECTION_ICONS: Record<SectionType, typeof Type> = {
  content: Type,
  twoColumn: Columns,
  stats: BarChart3,
  timeline: Clock,
};

const BLOCK_ICONS: Record<ContentBlockType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  imageFrame: Frame,
  carousel: Images,
  button: MousePointerClick,
  buttonGroup: MousePointerClick,
  spacer: Space,
};

function getDefaultContent(type: SectionType): SectionContent {
  switch (type) {
    case "content":
      return {
        blocks: [],
      };
    case "twoColumn":
      return {
        layout: "imageLeft",
        leftBlocks: [],
        rightBlocks: [],
      };
    case "stats":
      return {
        stats: [],
      };
    case "timeline":
      return {
        timelineItems: [],
      };
    default:
      return {};
  }
}

function getDefaultBlock(blockType: ContentBlockType): ContentBlock {
  switch (blockType) {
    case "text":
      return {
        blockType: "text",
        text: {
          textType: "paragraph",
          content: { en: "", pt: "" },
          size: "md",
          align: "left",
        },
      };
    case "image":
      return {
        blockType: "image",
        image: {
          url: "",
          alt: { en: "", pt: "" },
          aspectRatio: "video",
          objectFit: "cover",
          maxWidth: "full",
          rounded: true,
        },
      };
    case "imageFrame":
      return {
        blockType: "imageFrame",
        imageFrame: {
          url: "",
          alt: { en: "", pt: "" },
          aspectRatio: "video",
          objectFit: "cover",
          maxWidth: "lg",
        },
      };
    case "button":
      return {
        blockType: "button",
        button: {
          text: { en: "", pt: "" },
          url: "",
          variant: "default",
          size: "default",
        },
      };
    case "buttonGroup":
      return {
        blockType: "buttonGroup",
        buttonGroup: {
          buttons: [],
          align: "left",
        },
      };
    case "carousel":
      return {
        blockType: "carousel",
        carousel: {
          images: [],
          aspectRatio: "video",
          maxWidth: "full",
        },
      };
    case "spacer":
      return {
        blockType: "spacer",
        spacer: {
          size: "md",
        },
      };
    default:
      return { blockType: "text" };
  }
}

export function CompetitionsManager({ initialSections }: Props) {
  const intlayerContent = useIntlayer("admin-competitions-page");
  const content = intlayerContent;
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCallback, setUploadCallback] = useState<((url: string) => void) | null>(null);

  const [sections, setSections] = useState(initialSections);
  const [optimisticSections, updateOptimisticSections] = useOptimistic(
    sections,
    (state: CompetitionSectionData[], action: SectionAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.section];
        case "update":
          return state.map((s) =>
            s.id === action.section.id ? action.section : s
          );
        case "delete":
          return state.filter((s) => s.id !== action.sectionId);
        case "reorder":
          return action.sections;
        default:
          return state;
      }
    }
  );

  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isBlockTypeDialogOpen, setIsBlockTypeDialogOpen] = useState(false);
  const [blockTargetColumn, setBlockTargetColumn] = useState<"blocks" | "leftBlocks" | "rightBlocks">("blocks");
  const [editingSection, setEditingSection] = useState<CompetitionSectionData | null>(null);
  const [deletingSection, setDeletingSection] = useState<CompetitionSectionData | null>(null);

  const [selectedType, setSelectedType] = useState<SectionType | null>(null);
  const [formContent, setFormContent] = useState<SectionContent>({});

  const resetForm = () => {
    setSelectedType(null);
    setFormContent({});
  };

  const handleSelectType = (type: SectionType) => {
    setSelectedType(type);
    setFormContent(getDefaultContent(type));
    setIsTypeDialogOpen(false);
  };

  const triggerImageUpload = (callback: (url: string) => void) => {
    setUploadCallback(() => callback);
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const formDataObj = new FormData();
    formDataObj.append("file", file);

    try {
      const result = await filesApi.post({ input: formDataObj });
      if (result.success && uploadCallback) {
        uploadCallback(result.data.url);
        setUploadCallback(null);
      } else {
        toast.error(content.toast.createError.value);
      }
    } catch {
      toast.error(content.toast.createError.value);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = () => {
    if (!selectedType) return;

    startTransition(async () => {
      const now = new Date().toISOString();
      const tempSection: CompetitionSectionData = {
        id: `temp-${Date.now()}`,
        type: selectedType,
        content: formContent,
        order: sections.length,
        visible: true,
        createdAt: now,
        updatedAt: now,
      };

      updateOptimisticSections({ type: "add", section: tempSection });

      const result = await createCompetitionSection({
        type: selectedType,
        content: formContent,
      });

      if (result.success) {
        setSections((prev) => [...prev, result.data]);
        toast.success(content.toast.createSuccess.value);
        resetForm();
      } else {
        toast.error(content.toast.createError.value);
      }
    });
  };

  const handleUpdate = () => {
    if (!editingSection) return;

    startTransition(async () => {
      const updatedSection: CompetitionSectionData = {
        ...editingSection,
        content: formContent,
        updatedAt: new Date().toISOString(),
      };

      updateOptimisticSections({ type: "update", section: updatedSection });

      const result = await updateCompetitionSection(editingSection.id, {
        content: formContent,
      });

      if (result.success) {
        setSections((prev) =>
          prev.map((s) => (s.id === result.data.id ? result.data : s))
        );
        toast.success(content.toast.updateSuccess.value);
        setEditingSection(null);
        resetForm();
      } else {
        toast.error(content.toast.updateError.value);
      }
    });
  };

  const handleDelete = () => {
    if (!deletingSection) return;

    startTransition(async () => {
      updateOptimisticSections({ type: "delete", sectionId: deletingSection.id });

      const result = await deleteCompetitionSection(deletingSection.id);

      if (result.success) {
        setSections((prev) => prev.filter((s) => s.id !== deletingSection.id));
        toast.success(content.toast.deleteSuccess.value);
      } else {
        toast.error(content.toast.deleteError.value);
      }

      setDeletingSection(null);
    });
  };

  const handleToggleVisibility = (section: CompetitionSectionData) => {
    startTransition(async () => {
      const updatedSection = { ...section, visible: !section.visible };
      updateOptimisticSections({ type: "update", section: updatedSection });

      const result = await toggleSectionVisibility(section.id);

      if (result.success) {
        setSections((prev) =>
          prev.map((s) => (s.id === result.data.id ? result.data : s))
        );
        toast.success(content.toast.visibilitySuccess.value);
      } else {
        toast.error(content.toast.visibilityError.value);
      }
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newSections = [...optimisticSections];
    [newSections[index - 1], newSections[index]] = [
      newSections[index],
      newSections[index - 1],
    ];
    const reorderedSections = newSections.map((s, i) => ({ ...s, order: i }));

    startTransition(async () => {
      updateOptimisticSections({ type: "reorder", sections: reorderedSections });

      const result = await reorderCompetitionSections(
        reorderedSections.map((s) => s.id)
      );

      if (result.success) {
        setSections(reorderedSections);
        toast.success(content.toast.reorderSuccess.value);
      } else {
        toast.error(content.toast.reorderError.value);
      }
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === optimisticSections.length - 1) return;

    const newSections = [...optimisticSections];
    [newSections[index], newSections[index + 1]] = [
      newSections[index + 1],
      newSections[index],
    ];
    const reorderedSections = newSections.map((s, i) => ({ ...s, order: i }));

    startTransition(async () => {
      updateOptimisticSections({ type: "reorder", sections: reorderedSections });

      const result = await reorderCompetitionSections(
        reorderedSections.map((s) => s.id)
      );

      if (result.success) {
        setSections(reorderedSections);
        toast.success(content.toast.reorderSuccess.value);
      } else {
        toast.error(content.toast.reorderError.value);
      }
    });
  };

  const openEditDialog = (section: CompetitionSectionData) => {
    setFormContent(section.content);
    setEditingSection(section);
  };

  const openBlockTypeDialog = (column: "blocks" | "leftBlocks" | "rightBlocks") => {
    setBlockTargetColumn(column);
    setIsBlockTypeDialogOpen(true);
  };

  const addBlock = (blockType: ContentBlockType) => {
    const newBlock = getDefaultBlock(blockType);
    setFormContent((prev) => ({
      ...prev,
      [blockTargetColumn]: [...(prev[blockTargetColumn] ?? []), newBlock],
    }));
    setIsBlockTypeDialogOpen(false);
  };

  const updateBlock = (
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number,
    updates: Partial<ContentBlock>
  ) => {
    setFormContent((prev) => ({
      ...prev,
      [column]: prev[column]?.map((block, i) =>
        i === index ? { ...block, ...updates } : block
      ),
    }));
  };

  const removeBlock = (column: "blocks" | "leftBlocks" | "rightBlocks", index: number) => {
    setFormContent((prev) => ({
      ...prev,
      [column]: prev[column]?.filter((_, i) => i !== index),
    }));
  };

  const moveBlockUp = (column: "blocks" | "leftBlocks" | "rightBlocks", index: number) => {
    if (index === 0) return;
    setFormContent((prev) => {
      const blocks = [...(prev[column] ?? [])];
      [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
      return { ...prev, [column]: blocks };
    });
  };

  const moveBlockDown = (column: "blocks" | "leftBlocks" | "rightBlocks", index: number) => {
    setFormContent((prev) => {
      const blocks = prev[column] ?? [];
      if (index >= blocks.length - 1) return prev;
      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return { ...prev, [column]: newBlocks };
    });
  };

  const addStat = () => {
    setFormContent((prev) => ({
      ...prev,
      stats: [...(prev.stats ?? []), { value: "", label: { en: "", pt: "" } }],
    }));
  };

  const updateStat = (index: number, updates: Partial<StatItem>) => {
    setFormContent((prev) => ({
      ...prev,
      stats: prev.stats?.map((stat, i) =>
        i === index ? { ...stat, ...updates } : stat
      ),
    }));
  };

  const removeStat = (index: number) => {
    setFormContent((prev) => ({
      ...prev,
      stats: prev.stats?.filter((_, i) => i !== index),
    }));
  };

  const addTimelineItem = () => {
    setFormContent((prev) => ({
      ...prev,
      timelineItems: [
        ...(prev.timelineItems ?? []),
        {
          year: "",
          title: { en: "", pt: "" },
          description: { en: "", pt: "" },
        },
      ],
    }));
  };

  const updateTimelineItem = (index: number, updates: Partial<TimelineItem>) => {
    setFormContent((prev) => ({
      ...prev,
      timelineItems: prev.timelineItems?.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
    }));
  };

  const removeTimelineItem = (index: number) => {
    setFormContent((prev) => ({
      ...prev,
      timelineItems: prev.timelineItems?.filter((_, i) => i !== index),
    }));
  };

  const renderTextBlockEditor = (
    block: ContentBlock,
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number
  ) => {
    const data = block.text as TextBlockData;
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 flex-wrap">
          <Select
            value={data.textType}
            onValueChange={(value: TextBlockData["textType"]) =>
              updateBlock(column, index, {
                text: { ...data, textType: value },
              })
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heading">{content.form.text.heading}</SelectItem>
              <SelectItem value="paragraph">{content.form.text.paragraph}</SelectItem>
              <SelectItem value="label">{content.form.text.label}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={data.size ?? "md"}
            onValueChange={(value) =>
              updateBlock(column, index, { text: { ...data, size: value as TextBlockData["size"] } })
            }
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">SM</SelectItem>
              <SelectItem value="md">MD</SelectItem>
              <SelectItem value="lg">LG</SelectItem>
              <SelectItem value="xl">XL</SelectItem>
              <SelectItem value="2xl">2XL</SelectItem>
              <SelectItem value="3xl">3XL</SelectItem>
              <SelectItem value="4xl">4XL</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={data.align ?? "left"}
            onValueChange={(value) =>
              updateBlock(column, index, { text: { ...data, align: value as TextBlockData["align"] } })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{content.form.text.left}</SelectItem>
              <SelectItem value="center">{content.form.text.center}</SelectItem>
              <SelectItem value="right">{content.form.text.right}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={data.color ?? "default"}
            onValueChange={(value) =>
              updateBlock(column, index, { text: { ...data, color: value } })
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-foreground" />
                  {content.form.text.colors.default}
                </div>
              </SelectItem>
              <SelectItem value="primary">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  {content.form.text.colors.primary}
                </div>
              </SelectItem>
              <SelectItem value="muted">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  {content.form.text.colors.muted}
                </div>
              </SelectItem>
              <SelectItem value="accent">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-foreground" />
                  {content.form.text.colors.accent}
                </div>
              </SelectItem>
              <SelectItem value="destructive">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  {content.form.text.colors.destructive}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tabs defaultValue="en" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="en">{content.form.languages.english}</TabsTrigger>
            <TabsTrigger value="pt">{content.form.languages.portuguese}</TabsTrigger>
          </TabsList>
          <TabsContent value="en">
            <Textarea
              value={data.content.en}
              onChange={(e) =>
                updateBlock(column, index, {
                  text: { ...data, content: { ...data.content, en: e.target.value } },
                })
              }
              placeholder={content.form.text.contentPlaceholderEn.value}
              rows={data.textType === "paragraph" ? 4 : 1}
            />
          </TabsContent>
          <TabsContent value="pt">
            <Textarea
              value={data.content.pt}
              onChange={(e) =>
                updateBlock(column, index, {
                  text: { ...data, content: { ...data.content, pt: e.target.value } },
                })
              }
              placeholder={content.form.text.contentPlaceholderPt.value}
              rows={data.textType === "paragraph" ? 4 : 1}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderImageBlockEditor = (
    block: ContentBlock,
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number,
    isFrame: boolean = false
  ) => {
    const data = (isFrame ? block.imageFrame : block.image) as ImageBlockData | ImageFrameBlockData;
    const updateKey = isFrame ? "imageFrame" : "image";

    return (
      <div className="space-y-3">
        {data.url ? (
          <div className="flex gap-4">
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded border bg-muted">
              <Image src={data.url} alt="" fill className="object-cover" unoptimized />
            </div>
            <div className="flex-1 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  triggerImageUpload((url) =>
                    updateBlock(column, index, { [updateKey]: { ...data, url } })
                  )
                }
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {content.form.image.upload}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() =>
              triggerImageUpload((url) =>
                updateBlock(column, index, { [updateKey]: { ...data, url } })
              )
            }
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {content.form.image.upload}
          </Button>
        )}
        <Tabs defaultValue="en" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="en">{content.form.languages.english}</TabsTrigger>
            <TabsTrigger value="pt">{content.form.languages.portuguese}</TabsTrigger>
          </TabsList>
          <TabsContent value="en">
            <Input
              value={data.alt.en}
              onChange={(e) =>
                updateBlock(column, index, {
                  [updateKey]: { ...data, alt: { ...data.alt, en: e.target.value } },
                })
              }
              placeholder={content.form.image.altPlaceholderEn.value}
            />
          </TabsContent>
          <TabsContent value="pt">
            <Input
              value={data.alt.pt}
              onChange={(e) =>
                updateBlock(column, index, {
                  [updateKey]: { ...data, alt: { ...data.alt, pt: e.target.value } },
                })
              }
              placeholder={content.form.image.altPlaceholderPt.value}
            />
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Select
            value={data.aspectRatio ?? "video"}
            onValueChange={(value) =>
              updateBlock(column, index, { [updateKey]: { ...data, aspectRatio: value as ImageBlockData["aspectRatio"] } })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">16:9</SelectItem>
              <SelectItem value="square">1:1</SelectItem>
              <SelectItem value="4/5">4:5</SelectItem>
              <SelectItem value="3/4">3:4</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={data.objectFit ?? "cover"}
            onValueChange={(value) =>
              updateBlock(column, index, { [updateKey]: { ...data, objectFit: value as ImageBlockData["objectFit"] } })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">{content.form.image.objectFitOptions.cover}</SelectItem>
              <SelectItem value="contain">{content.form.image.objectFitOptions.contain}</SelectItem>
              <SelectItem value="fill">{content.form.image.objectFitOptions.fill}</SelectItem>
              <SelectItem value="none">{content.form.image.objectFitOptions.none}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={data.maxWidth ?? "full"}
            onValueChange={(value) =>
              updateBlock(column, index, { [updateKey]: { ...data, maxWidth: value as ImageBlockData["maxWidth"] } })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">SM</SelectItem>
              <SelectItem value="md">MD</SelectItem>
              <SelectItem value="lg">LG</SelectItem>
              <SelectItem value="xl">XL</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
          {!isFrame && (
            <div className="flex items-center gap-2">
              <Switch
                checked={(data as ImageBlockData).rounded ?? false}
                onCheckedChange={(checked) =>
                  updateBlock(column, index, { image: { ...data, rounded: checked } as ImageBlockData })
                }
              />
              <Label className="text-sm">{content.form.image.rounded}</Label>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderButtonBlockEditor = (
    block: ContentBlock,
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number
  ) => {
    const data = block.button as ButtonBlockData;
    return (
      <div className="space-y-3">
        <Tabs defaultValue="en" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="en">{content.form.languages.english}</TabsTrigger>
            <TabsTrigger value="pt">{content.form.languages.portuguese}</TabsTrigger>
          </TabsList>
          <TabsContent value="en">
            <Input
              value={data.text.en}
              onChange={(e) =>
                updateBlock(column, index, {
                  button: { ...data, text: { ...data.text, en: e.target.value } },
                })
              }
              placeholder={content.form.button.textPlaceholderEn.value}
            />
          </TabsContent>
          <TabsContent value="pt">
            <Input
              value={data.text.pt}
              onChange={(e) =>
                updateBlock(column, index, {
                  button: { ...data, text: { ...data.text, pt: e.target.value } },
                })
              }
              placeholder={content.form.button.textPlaceholderPt.value}
            />
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Input
            value={data.url}
            onChange={(e) =>
              updateBlock(column, index, { button: { ...data, url: e.target.value } })
            }
            placeholder={content.form.button.urlPlaceholder.value}
            className="flex-1 min-w-48"
          />
          <Select
            value={data.variant ?? "default"}
            onValueChange={(value) =>
              updateBlock(column, index, { button: { ...data, variant: value as ButtonBlockData["variant"] } })
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={data.size ?? "default"}
            onValueChange={(value) =>
              updateBlock(column, index, { button: { ...data, size: value as ButtonBlockData["size"] } })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={data.align ?? "left"}
            onValueChange={(value) =>
              updateBlock(column, index, { button: { ...data, align: value as ButtonBlockData["align"] } })
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{content.form.text.left}</SelectItem>
              <SelectItem value="center">{content.form.text.center}</SelectItem>
              <SelectItem value="right">{content.form.text.right}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              checked={data.fullWidth ?? false}
              onCheckedChange={(checked) =>
                updateBlock(column, index, { button: { ...data, fullWidth: checked } })
              }
            />
            <Label className="text-sm">{content.form.button.fullWidth}</Label>
          </div>
        </div>
      </div>
    );
  };

  const renderButtonGroupBlockEditor = (
    block: ContentBlock,
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number
  ) => {
    const data = block.buttonGroup!;
    const buttons = data.buttons ?? [];

    const addButtonToGroup = () => {
      updateBlock(column, index, {
        buttonGroup: {
          ...data,
          buttons: [
            ...buttons,
            { text: { en: "", pt: "" }, url: "", variant: "default", size: "default" },
          ],
        },
      });
    };

    const updateButtonInGroup = (btnIndex: number, updates: Partial<ButtonBlockData>) => {
      updateBlock(column, index, {
        buttonGroup: {
          ...data,
          buttons: buttons.map((btn, i) => (i === btnIndex ? { ...btn, ...updates } : btn)),
        },
      });
    };

    const removeButtonFromGroup = (btnIndex: number) => {
      updateBlock(column, index, {
        buttonGroup: { ...data, buttons: buttons.filter((_, i) => i !== btnIndex) },
      });
    };

    return (
      <div className="space-y-3">
        <Select
          value={data.align ?? "left"}
          onValueChange={(value: "left" | "center" | "right") =>
            updateBlock(column, index, { buttonGroup: { ...data, align: value } })
          }
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">{content.form.text.left}</SelectItem>
            <SelectItem value="center">{content.form.text.center}</SelectItem>
            <SelectItem value="right">{content.form.text.right}</SelectItem>
          </SelectContent>
        </Select>
        {buttons.map((btn, btnIndex) => (
          <Card key={btnIndex} className="p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Button {btnIndex + 1}</span>
                <Button variant="ghost" size="icon" onClick={() => removeButtonFromGroup(btnIndex)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Tabs defaultValue="en" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="en">EN</TabsTrigger>
                  <TabsTrigger value="pt">PT</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <Input
                    value={btn.text.en}
                    onChange={(e) =>
                      updateButtonInGroup(btnIndex, {
                        text: { ...btn.text, en: e.target.value },
                      })
                    }
                    placeholder={content.form.button.textPlaceholderEn.value}
                  />
                </TabsContent>
                <TabsContent value="pt">
                  <Input
                    value={btn.text.pt}
                    onChange={(e) =>
                      updateButtonInGroup(btnIndex, {
                        text: { ...btn.text, pt: e.target.value },
                      })
                    }
                    placeholder={content.form.button.textPlaceholderPt.value}
                  />
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 flex-wrap">
                <Input
                  value={btn.url}
                  onChange={(e) => updateButtonInGroup(btnIndex, { url: e.target.value })}
                  placeholder={content.form.button.urlPlaceholder.value}
                  className="flex-1 min-w-32"
                />
                <Select
                  value={btn.variant ?? "default"}
                  onValueChange={(value) =>
                    updateButtonInGroup(btnIndex, { variant: value as ButtonBlockData["variant"] })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="ghost">Ghost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}
        <Button variant="outline" onClick={addButtonToGroup} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          {content.form.button.addButton}
        </Button>
      </div>
    );
  };

  const renderCarouselBlockEditor = (
    block: ContentBlock,
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number
  ) => {
    const data = block.carousel as CarouselBlockData;
    const images = data.images ?? [];

    const addImageToCarousel = () => {
      triggerImageUpload((url) => {
        updateBlock(column, index, {
          carousel: {
            ...data,
            images: [...images, { url, alt: { en: "", pt: "" } }],
          },
        });
      });
    };

    const updateImageInCarousel = (imgIndex: number, updates: Partial<{ url: string; alt: { en: string; pt: string } }>) => {
      updateBlock(column, index, {
        carousel: {
          ...data,
          images: images.map((img, i) => (i === imgIndex ? { ...img, ...updates } : img)),
        },
      });
    };

    const removeImageFromCarousel = (imgIndex: number) => {
      updateBlock(column, index, {
        carousel: { ...data, images: images.filter((_, i) => i !== imgIndex) },
      });
    };

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={data.aspectRatio ?? "video"}
            onValueChange={(value) =>
              updateBlock(column, index, { carousel: { ...data, aspectRatio: value as CarouselBlockData["aspectRatio"] } })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">16:9</SelectItem>
              <SelectItem value="square">1:1</SelectItem>
              <SelectItem value="4/5">4:5</SelectItem>
              <SelectItem value="3/4">3:4</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={data.maxWidth ?? "full"}
            onValueChange={(value) =>
              updateBlock(column, index, { carousel: { ...data, maxWidth: value as CarouselBlockData["maxWidth"] } })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">SM</SelectItem>
              <SelectItem value="md">MD</SelectItem>
              <SelectItem value="lg">LG</SelectItem>
              <SelectItem value="xl">XL</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {images.map((img, imgIndex) => (
          <Card key={imgIndex} className="p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{content.form.carousel?.image ?? "Image"} {imgIndex + 1}</span>
                <Button variant="ghost" size="icon" onClick={() => removeImageFromCarousel(imgIndex)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {img.url ? (
                <div className="flex gap-4">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded border bg-muted">
                    <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        triggerImageUpload((url) => updateImageInCarousel(imgIndex, { url }))
                      }
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {content.form.carousel?.changeImage ?? "Change"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    triggerImageUpload((url) => updateImageInCarousel(imgIndex, { url }))
                  }
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {content.form.image.upload}
                </Button>
              )}
              <Tabs defaultValue="en" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="en">EN</TabsTrigger>
                  <TabsTrigger value="pt">PT</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <Input
                    value={img.alt.en}
                    onChange={(e) =>
                      updateImageInCarousel(imgIndex, { alt: { ...img.alt, en: e.target.value } })
                    }
                    placeholder={content.form.image.altPlaceholderEn.value}
                  />
                </TabsContent>
                <TabsContent value="pt">
                  <Input
                    value={img.alt.pt}
                    onChange={(e) =>
                      updateImageInCarousel(imgIndex, { alt: { ...img.alt, pt: e.target.value } })
                    }
                    placeholder={content.form.image.altPlaceholderPt.value}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        ))}
        <Button variant="outline" onClick={addImageToCarousel} className="w-full" disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {content.form.carousel?.addImage ?? "Add Image"}
        </Button>
      </div>
    );
  };

  const renderSpacerBlockEditor = (
    block: ContentBlock,
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number
  ) => {
    const data = block.spacer as SpacerBlockData;
    return (
      <div>
        <Label>{content.form.spacer.size}</Label>
        <Select
          value={data.size}
          onValueChange={(value) =>
            updateBlock(column, index, { spacer: { size: value as SpacerBlockData["size"] } })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="xs">{content.form.spacer.sizes.xs}</SelectItem>
            <SelectItem value="sm">{content.form.spacer.sizes.sm}</SelectItem>
            <SelectItem value="md">{content.form.spacer.sizes.md}</SelectItem>
            <SelectItem value="lg">{content.form.spacer.sizes.lg}</SelectItem>
            <SelectItem value="xl">{content.form.spacer.sizes.xl}</SelectItem>
            <SelectItem value="2xl">{content.form.spacer.sizes["2xl"]}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderBlockEditor = (
    block: ContentBlock,
    column: "blocks" | "leftBlocks" | "rightBlocks",
    index: number
  ) => {
    switch (block.blockType) {
      case "text":
        return renderTextBlockEditor(block, column, index);
      case "image":
        return renderImageBlockEditor(block, column, index, false);
      case "imageFrame":
        return renderImageBlockEditor(block, column, index, true);
      case "carousel":
        return renderCarouselBlockEditor(block, column, index);
      case "button":
        return renderButtonBlockEditor(block, column, index);
      case "buttonGroup":
        return renderButtonGroupBlockEditor(block, column, index);
      case "spacer":
        return renderSpacerBlockEditor(block, column, index);
      default:
        return null;
    }
  };

  const renderBlocksList = (column: "blocks" | "leftBlocks" | "rightBlocks") => {
    const blocks = formContent[column] ?? [];
    return (
      <div className="space-y-3">
        {blocks.map((block, index) => {
          const Icon = BLOCK_ICONS[block.blockType];
          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {content.blockTypes[block.blockType]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveBlockUp(column, index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveBlockDown(column, index)}
                    disabled={index === blocks.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeBlock(column, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {renderBlockEditor(block, column, index)}
            </Card>
          );
        })}
        <Button
          variant="outline"
          onClick={() => openBlockTypeDialog(column)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {content.addBlock}
        </Button>
      </div>
    );
  };

  const renderStatsEditor = () => (
    <div className="space-y-4">
      {formContent.stats?.map((stat, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="w-24">
                <Label>{content.form.stat.value}</Label>
                <Input
                  value={stat.value}
                  onChange={(e) => updateStat(index, { value: e.target.value })}
                  placeholder={content.form.stat.valuePlaceholder.value}
                />
              </div>
              <div className="flex-1">
                <Label>{content.form.stat.label}</Label>
                <Tabs defaultValue="en" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="en">EN</TabsTrigger>
                    <TabsTrigger value="pt">PT</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Input
                      value={stat.label.en}
                      onChange={(e) =>
                        updateStat(index, { label: { ...stat.label, en: e.target.value } })
                      }
                      placeholder={content.form.stat.labelPlaceholderEn.value}
                    />
                  </TabsContent>
                  <TabsContent value="pt">
                    <Input
                      value={stat.label.pt}
                      onChange={(e) =>
                        updateStat(index, { label: { ...stat.label, pt: e.target.value } })
                      }
                      placeholder={content.form.stat.labelPlaceholderPt.value}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              <Button variant="ghost" size="icon" className="mt-6" onClick={() => removeStat(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="outline" onClick={addStat} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {content.form.stat.addStat}
      </Button>
    </div>
  );

  const renderTimelineEditor = () => (
    <div className="space-y-4">
      {formContent.timelineItems?.map((item, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-4">
            <div className="flex gap-2 items-start">
              <div className="w-24">
                <Label>{content.form.timelineItem.year}</Label>
                <Input
                  value={item.year}
                  onChange={(e) => updateTimelineItem(index, { year: e.target.value })}
                  placeholder={content.form.timelineItem.yearPlaceholder.value}
                />
              </div>
              <div className="flex-1">
                <Label>{content.form.timelineItem.title}</Label>
                <Tabs defaultValue="en" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="en">EN</TabsTrigger>
                    <TabsTrigger value="pt">PT</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Input
                      value={item.title.en}
                      onChange={(e) =>
                        updateTimelineItem(index, { title: { ...item.title, en: e.target.value } })
                      }
                      placeholder={content.form.timelineItem.titlePlaceholderEn.value}
                    />
                  </TabsContent>
                  <TabsContent value="pt">
                    <Input
                      value={item.title.pt}
                      onChange={(e) =>
                        updateTimelineItem(index, { title: { ...item.title, pt: e.target.value } })
                      }
                      placeholder={content.form.timelineItem.titlePlaceholderPt.value}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6"
                onClick={() => removeTimelineItem(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label>{content.form.timelineItem.description}</Label>
              <Tabs defaultValue="en" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="en">EN</TabsTrigger>
                  <TabsTrigger value="pt">PT</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <Textarea
                    value={item.description.en}
                    onChange={(e) =>
                      updateTimelineItem(index, {
                        description: { ...item.description, en: e.target.value },
                      })
                    }
                    placeholder={content.form.timelineItem.descriptionPlaceholderEn.value}
                    rows={2}
                  />
                </TabsContent>
                <TabsContent value="pt">
                  <Textarea
                    value={item.description.pt}
                    onChange={(e) =>
                      updateTimelineItem(index, {
                        description: { ...item.description, pt: e.target.value },
                      })
                    }
                    placeholder={content.form.timelineItem.descriptionPlaceholderPt.value}
                    rows={2}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="outline" onClick={addTimelineItem} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {content.form.timelineItem.addItem}
      </Button>
    </div>
  );

  const renderSectionEditor = () => {
    const sectionType = editingSection?.type ?? selectedType;
    if (!sectionType) return null;

    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto py-4">
        {sectionType === "content" && renderBlocksList("blocks")}

        {sectionType === "twoColumn" && (
          <>
            <div className="space-y-2">
              <Label>{content.form.layout.label}</Label>
              <Select
                value={formContent.layout ?? "imageLeft"}
                onValueChange={(value: "imageLeft" | "imageRight") =>
                  setFormContent((prev) => ({ ...prev, layout: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imageLeft">{content.form.layout.leftFirst}</SelectItem>
                  <SelectItem value="imageRight">{content.form.layout.rightFirst}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">{content.form.leftColumn}</Label>
                {renderBlocksList("leftBlocks")}
              </div>
              <div>
                <Label className="mb-2 block">{content.form.rightColumn}</Label>
                {renderBlocksList("rightBlocks")}
              </div>
            </div>
          </>
        )}

        {sectionType === "stats" && renderStatsEditor()}

        {sectionType === "timeline" && renderTimelineEditor()}

        <div className="flex items-center gap-2 pt-4 border-t">
          <Switch
            checked={formContent.fullWidth ?? false}
            onCheckedChange={(checked) =>
              setFormContent((prev) => ({ ...prev, fullWidth: checked }))
            }
          />
          <Label>{content.form.fullWidth}</Label>
        </div>
      </div>
    );
  };

  const getSectionTypeLabel = (type: SectionType) => {
    return content.sectionTypes[type];
  };

  const renderSectionPreview = (section: CompetitionSectionData) => {
    const blockCount = section.content.blocks?.length ?? 0;
    const leftCount = section.content.leftBlocks?.length ?? 0;
    const rightCount = section.content.rightBlocks?.length ?? 0;
    const statCount = section.content.stats?.length ?? 0;
    const timelineCount = section.content.timelineItems?.length ?? 0;

    return (
      <div className="text-sm text-muted-foreground">
        {blockCount > 0 && <p>{blockCount} block(s)</p>}
        {(leftCount > 0 || rightCount > 0) && (
          <p>
            Left: {leftCount} block(s), Right: {rightCount} block(s)
          </p>
        )}
        {statCount > 0 && <p>{statCount} statistic(s)</p>}
        {timelineCount > 0 && <p>{timelineCount} timeline item(s)</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <SectionsPreview sections={optimisticSections} />

      <Button onClick={() => setIsTypeDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {content.addSection}
      </Button>

      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{content.dialog.selectType}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {(["content", "twoColumn", "stats", "timeline"] as SectionType[]).map((type) => {
              const Icon = SECTION_ICONS[type];
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4 text-center"
                  onClick={() => handleSelectType(type)}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span className="leading-tight">{content.sectionTypes[type]}</span>
                  <span className="text-xs text-muted-foreground font-normal leading-tight text-wrap">
                    {content.sectionDescriptions[type]}
                  </span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockTypeDialogOpen} onOpenChange={setIsBlockTypeDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{content.dialog.selectBlockType}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {(["text", "image", "imageFrame", "carousel", "button", "buttonGroup", "spacer"] as ContentBlockType[]).map(
              (blockType) => {
                const Icon = BLOCK_ICONS[blockType];
                return (
                  <Button
                    key={blockType}
                    variant="outline"
                    className="h-auto flex-col gap-2 p-4 text-center"
                    onClick={() => addBlock(blockType)}
                  >
                    <Icon className="h-6 w-6 shrink-0" />
                    <span className="leading-tight">{content.blockTypes[blockType]}</span>
                    <span className="text-xs text-muted-foreground font-normal leading-tight text-wrap">
                      {content.blockDescriptions[blockType]}
                    </span>
                  </Button>
                );
              }
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedType !== null && !editingSection}
        onOpenChange={(open) => !open && resetForm()}
      >
        <DialogContent className="max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {content.dialog.addTitle} - {selectedType && getSectionTypeLabel(selectedType)}
            </DialogTitle>
          </DialogHeader>
          {renderSectionEditor()}
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              {content.form.cancel}
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
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
        open={!!editingSection}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSection(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {content.dialog.editTitle} - {editingSection && getSectionTypeLabel(editingSection.type)}
            </DialogTitle>
          </DialogHeader>
          {renderSectionEditor()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingSection(null);
                resetForm();
              }}
            >
              {content.form.cancel}
            </Button>
            <Button onClick={handleUpdate} disabled={isPending}>
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
        open={!!deletingSection}
        onOpenChange={(open) => !open && setDeletingSection(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{content.dialog.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{content.dialog.deleteDescription}</AlertDialogDescription>
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

      {optimisticSections.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{content.emptyState.title}</CardTitle>
            <CardDescription>{content.emptyState.description}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {optimisticSections.map((section, index) => {
            const Icon = SECTION_ICONS[section.type];
            return (
              <Card key={section.id} className={section.visible ? "" : "opacity-50"}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{getSectionTypeLabel(section.type)}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || isPending}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === optimisticSections.length - 1 || isPending}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleVisibility(section)}
                        disabled={isPending}
                      >
                        {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(section)}
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeletingSection(section)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>{renderSectionPreview(section)}</CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

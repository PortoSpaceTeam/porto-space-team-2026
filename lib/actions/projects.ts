"use server";

import { connectDB } from "@/lib/db";
import {
  Projects,
  type IProject,
  type LocalizedString,
  type StatItem,
  type ProjectDepartment,
  type GalleryImage,
  type ProjectMedia,
  type MediaType,
} from "@/models/Project";
import { getAdminSession, type ActionResult } from "./users";
import { revalidatePath } from "next/cache";
import { CompetitionSectionData } from "./competitions";
import {
  ButtonBlockData,
  ButtonGroupBlockData,
  CarouselBlockData,
  CarouselImage,
  ContentBlock,
  ImageBlockData,
  ImageFrameBlockData,
  SectionContent,
  SpacerBlockData,
  TextBlockData,
  TimelineItem,
} from "@/models/CompetitionSection";

export type ProjectDepartmentData = {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  bulletPoints: LocalizedString[];
  gallery: GalleryImage[];
  order: number;
};

export type ProjectMediaData = {
  id: string;
  type: MediaType;
  url: string;
  alt: LocalizedString;
  tags: LocalizedString[];
  order: number;
};

export type ProjectData = {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  logo: string;
  order: number;
  visible: boolean;
  heroDescription: LocalizedString;
  stats: StatItem[];
  projectImage: string;
  projectImageAlt: LocalizedString;
  departments: ProjectDepartmentData[];
  media: ProjectMediaData[];
  customSections: CompetitionSectionData[];
  createdAt: string;
  updatedAt: string;
};

function transformLocalizedString(ls: LocalizedString): LocalizedString {
  return { en: ls.en, pt: ls.pt };
}

function transformDepartment(dept: ProjectDepartment): ProjectDepartmentData {
  return {
    id: dept.id,
    title: transformLocalizedString(dept.title),
    description: transformLocalizedString(dept.description),
    bulletPoints: dept.bulletPoints.map(transformLocalizedString),
    gallery: dept.gallery.map((img) => ({
      url: img.url,
      alt: transformLocalizedString(img.alt),
    })),
    order: dept.order,
  };
}

function transformMedia(media: ProjectMedia): ProjectMediaData {
  return {
    id: media.id,
    type: media.type,
    url: media.url,
    alt: transformLocalizedString(media.alt),
    tags: media.tags.map(transformLocalizedString),
    order: media.order,
  };
}

function transformTextBlockData(block: TextBlockData): TextBlockData {
  return {
    textType: block.textType,
    content: transformLocalizedString(block.content),
    color: block.color,
    size: block.size,
    align: block.align,
    bold: block.bold,
  };
}

function transformImageBlockData(block: ImageBlockData): ImageBlockData {
  return {
    url: block.url,
    alt: transformLocalizedString(block.alt),
    aspectRatio: block.aspectRatio,
    objectFit: block.objectFit,
    maxWidth: block.maxWidth,
    rounded: block.rounded,
  };
}

function transformImageFrameBlockData(
  block: ImageFrameBlockData,
): ImageFrameBlockData {
  return {
    url: block.url,
    alt: transformLocalizedString(block.alt),
    aspectRatio: block.aspectRatio,
    objectFit: block.objectFit,
    maxWidth: block.maxWidth,
  };
}

function transformButtonBlockData(block: ButtonBlockData): ButtonBlockData {
  return {
    text: transformLocalizedString(block.text),
    url: block.url,
    variant: block.variant,
    size: block.size,
    fullWidth: block.fullWidth,
    align: block.align,
  };
}

function transformButtonGroupBlockData(
  block: ButtonGroupBlockData,
): ButtonGroupBlockData {
  return {
    buttons: block.buttons?.map(transformButtonBlockData) ?? [],
    align: block.align,
  };
}

function transformSpacerBlockData(block: SpacerBlockData): SpacerBlockData {
  return {
    size: block.size,
  };
}

function transformCarouselImage(image: CarouselImage): CarouselImage {
  return {
    url: image.url,
    alt: transformLocalizedString(image.alt),
  };
}

function transformCarouselBlockData(
  block: CarouselBlockData,
): CarouselBlockData {
  return {
    images: block.images?.map(transformCarouselImage) ?? [],
    aspectRatio: block.aspectRatio,
    maxWidth: block.maxWidth,
  };
}

function transformContentBlock(block: ContentBlock): ContentBlock {
  return {
    blockType: block.blockType,
    text: block.text ? transformTextBlockData(block.text) : undefined,
    image: block.image ? transformImageBlockData(block.image) : undefined,
    imageFrame: block.imageFrame
      ? transformImageFrameBlockData(block.imageFrame)
      : undefined,
    carousel: block.carousel
      ? transformCarouselBlockData(block.carousel)
      : undefined,
    button: block.button ? transformButtonBlockData(block.button) : undefined,
    buttonGroup: block.buttonGroup
      ? transformButtonGroupBlockData(block.buttonGroup)
      : undefined,
    spacer: block.spacer ? transformSpacerBlockData(block.spacer) : undefined,
  };
}

function transformStatItem(item: StatItem): StatItem {
  return {
    value: item.value,
    label: transformLocalizedString(item.label),
  };
}

function transformTimelineItem(item: TimelineItem): TimelineItem {
  return {
    year: item.year,
    title: transformLocalizedString(item.title),
    description: transformLocalizedString(item.description),
  };
}

function transformContent(content: SectionContent): SectionContent {
  return {
    blocks: content.blocks?.map(transformContentBlock) ?? [],
    stats: content.stats?.map(transformStatItem) ?? [],
    timelineItems: content.timelineItems?.map(transformTimelineItem) ?? [],
    layout: content.layout,
    leftBlocks: content.leftBlocks?.map(transformContentBlock) ?? [],
    rightBlocks: content.rightBlocks?.map(transformContentBlock) ?? [],
    fullWidth: content.fullWidth,
    align: content.align,
  };
}

function transformSection(doc: CompetitionSectionData): CompetitionSectionData {
  return {
    id: doc.id.toString(),
    type: doc.type,
    content: transformContent(doc.content),
    order: doc.order,
    visible: doc.visible,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function transformProject(doc: IProject): ProjectData {
  return {
    id: doc._id.toString(),
    name: transformLocalizedString(doc.name),
    slug: doc.slug,
    description: transformLocalizedString(doc.description),
    logo: doc.logo,
    order: doc.order,
    visible: doc.visible,
    heroDescription: transformLocalizedString(
      doc.heroDescription || { en: "", pt: "" },
    ),
    stats: (doc.stats || []).map((stat) => ({
      value: stat.value,
      label: transformLocalizedString(stat.label),
    })),
    projectImage: doc.projectImage || "",
    projectImageAlt: transformLocalizedString(
      doc.projectImageAlt || { en: "", pt: "" },
    ),
    departments: (doc.departments || [])
      .sort((a, b) => a.order - b.order)
      .map(transformDepartment),
    media: (doc.media || [])
      .sort((a, b) => a.order - b.order)
      .map(transformMedia),
    customSections: (doc.customSections || [])
      .sort((a, b) => a.order - b.order)
      .filter((s) => s.visible)
      .map(transformSection),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function transformProjectAdmin(doc: IProject): ProjectData {
  return {
    ...transformProject(doc),
    customSections: (doc.customSections || [])
      .sort((a, b) => a.order - b.order)
      .map(transformSection),
  };
}

function revalidateProjects(slug?: string) {
  revalidatePath("/[locale]/(main)/projects", "page");
  if (slug) {
    revalidatePath(`/en/projects/${slug}`);
    revalidatePath(`/pt/projects/${slug}`);
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getProjects(): Promise<ActionResult<ProjectData[]>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const projects = await Projects.find().sort({ order: 1 });
    return { success: true, data: projects.map(transformProject) };
  } catch (error) {
    console.error("Error fetching projects:", error);
    return { success: false, error: "Failed to fetch projects" };
  }
}

export async function getPublicProjects(): Promise<ProjectData[]> {
  try {
    await connectDB();
    const projects = await Projects.find({ visible: true }).sort({ order: 1 });
    return projects.map(transformProject);
  } catch (error) {
    console.error("Error fetching public projects:", error);
    return [];
  }
}

export async function getProjectBySlug(
  slug: string,
): Promise<ProjectData | null> {
  try {
    await connectDB();
    const project = await Projects.findOne({ slug, visible: true });
    if (!project) return null;
    return transformProject(project);
  } catch (error) {
    console.error("Error fetching project by slug:", error);
    return null;
  }
}

export async function getProjectBySlugAdmin(
  slug: string,
): Promise<ActionResult<ProjectData>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const project = await Projects.findOne({ slug });
    if (!project) {
      return { success: false, error: "Project not found" };
    }
    return { success: true, data: transformProjectAdmin(project) };
  } catch (error) {
    console.error("Error fetching project by slug:", error);
    return { success: false, error: "Failed to fetch project" };
  }
}

export async function createProject(data: {
  name: LocalizedString;
  description: LocalizedString;
  logo: string;
  slug?: string;
}): Promise<ActionResult<ProjectData>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const maxOrder = await Projects.findOne().sort({ order: -1 });
    const order = (maxOrder?.order ?? -1) + 1;

    const slug = data.slug || generateSlug(data.name.en);

    const existingProject = await Projects.findOne({ slug });
    if (existingProject) {
      return {
        success: false,
        error: "A project with this slug already exists",
      };
    }

    const project = await Projects.create({
      name: data.name,
      slug,
      description: data.description,
      logo: data.logo,
      order,
      visible: true,
      heroDescription: { en: "", pt: "" },
      stats: [],
      projectImage: "",
      projectImageAlt: { en: "", pt: "" },
      departments: [],
      media: [],
      customSections: [],
    });

    revalidateProjects(slug);
    return { success: true, data: transformProject(project) };
  } catch (error) {
    console.error("Error creating project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(
  projectId: string,
  data: {
    name?: LocalizedString;
    slug?: string;
    description?: LocalizedString;
    logo?: string;
    visible?: boolean;
  },
): Promise<ActionResult<ProjectData>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();

    if (data.slug) {
      const existingProject = await Projects.findOne({
        slug: data.slug,
        _id: { $ne: projectId },
      });
      if (existingProject) {
        return {
          success: false,
          error: "A project with this slug already exists",
        };
      }
    }

    const project = await Projects.findByIdAndUpdate(
      projectId,
      { $set: data },
      { new: true },
    );

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    revalidateProjects(project.slug);
    return { success: true, data: transformProject(project) };
  } catch (error) {
    console.error("Error updating project:", error);
    return { success: false, error: "Failed to update project" };
  }
}

export async function updateProjectContent(
  projectId: string,
  data: {
    heroDescription?: LocalizedString;
    stats?: StatItem[];
    projectImage?: string;
    projectImageAlt?: LocalizedString;
    departments?: ProjectDepartmentData[];
    media?: ProjectMediaData[];
    customSections?: CompetitionSectionData[];
  },
): Promise<ActionResult<ProjectData>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();

    const project = await Projects.findByIdAndUpdate(
      projectId,
      { $set: data },
      { new: true },
    );

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    revalidateProjects(project.slug);
    return { success: true, data: transformProjectAdmin(project) };
  } catch (error) {
    console.error("Error updating project content:", error);
    return { success: false, error: "Failed to update project content" };
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const result = await Projects.findByIdAndDelete(projectId);

    if (!result) {
      return { success: false, error: "Project not found" };
    }

    revalidateProjects(result.slug);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}

export async function reorderProjects(
  projectIds: string[],
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();

    const bulkOps = projectIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    }));

    await Projects.bulkWrite(bulkOps);

    revalidateProjects();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error reordering projects:", error);
    return { success: false, error: "Failed to reorder projects" };
  }
}

export async function toggleProjectVisibility(
  projectId: string,
): Promise<ActionResult<ProjectData>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const project = await Projects.findById(projectId);

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    project.visible = !project.visible;
    await project.save();

    revalidateProjects(project.slug);
    return { success: true, data: transformProject(project) };
  } catch (error) {
    console.error("Error toggling project visibility:", error);
    return { success: false, error: "Failed to toggle visibility" };
  }
}

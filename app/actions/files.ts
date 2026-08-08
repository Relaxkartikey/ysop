"use server";

import { z } from "zod";
import {
  startUpload,
  finishUpload,
  listOwned,
  renameOwned,
  deleteOwned,
  startReplace,
  finishReplace,
  publicFileBySlug,
  publicFolderBySlug,
  downloadUrlForSlug,
  downloadUrlForOwned,
  getUsageSummary,
  listFolderTree,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFile,
  moveFiles,
  moveFolder,
  setPermanentStatus,
  setDevPlan,
  listStorageNodesForOwner,
  connectR2StorageNode,
  testStorageNodeConnection,
  disconnectStorageNode,
  updateStorageNodeQuota,
} from "@/server/files.server";

const token = z.string().nullish();

export async function startUploadAction(input: unknown) {
  const data = z
    .object({
      filename: z.string().min(1).max(255),
      size: z.number().int().positive(),
      mimeType: z.string().max(200),
      expiryHours: z.number().int(),
      isPermanent: z.boolean().optional(),
      storageNodeId: z.string().uuid().nullish(),
      accessToken: token,
    })
    .parse(input);
  return startUpload(data);
}

export async function finishUploadAction(input: unknown) {
  const data = z
    .object({
      slug: z.string().min(1).max(32),
      storageKey: z.string().min(1).max(300),
      storageNodeId: z.string().uuid(),
      filename: z.string().min(1).max(255),
      size: z.number().int().positive(),
      mimeType: z.string().max(200),
      expiryHours: z.number().int(),
      isPermanent: z.boolean().optional(),
      folderId: z.string().uuid().nullish(),
      accessToken: token,
    })
    .parse(input);
  return finishUpload(data);
}

export async function listFilesAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  return listOwned(data.accessToken);
}

export async function renameFileAction(input: unknown) {
  const data = z
    .object({ id: z.string().uuid(), filename: z.string().min(1).max(255), accessToken: token })
    .parse(input);
  return renameOwned(data.id, data.filename, data.accessToken);
}

export async function deleteFileAction(input: unknown) {
  const data = z.object({ id: z.string().uuid(), accessToken: token }).parse(input);
  return deleteOwned(data.id, data.accessToken);
}

export async function startReplaceAction(input: unknown) {
  const data = z
    .object({
      id: z.string().uuid(),
      mimeType: z.string().max(200),
      size: z.number().int().positive(),
      accessToken: token,
    })
    .parse(input);
  return startReplace(data);
}

export async function finishReplaceAction(input: unknown) {
  const data = z
    .object({ id: z.string().uuid(), size: z.number().int().positive(), accessToken: token })
    .parse(input);
  return finishReplace(data);
}

export async function getFileBySlugAction(input: unknown) {
  const data = z.object({ slug: z.string().min(1).max(32) }).parse(input);
  return publicFileBySlug(data.slug);
}

export async function getFolderBySlugAction(input: unknown) {
  const data = z.object({ slug: z.string().min(1).max(32) }).parse(input);
  return publicFolderBySlug(data.slug);
}

export async function getDownloadUrlAction(input: unknown) {
  const data = z.object({ slug: z.string().min(1).max(32) }).parse(input);
  return downloadUrlForSlug(data.slug);
}

export async function getOwnedDownloadUrlAction(input: unknown) {
  const data = z.object({ id: z.string().uuid(), accessToken: token }).parse(input);
  return downloadUrlForOwned(data.id, data.accessToken);
}

export async function getUsageAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  return getUsageSummary(data.accessToken);
}

export async function listFoldersAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  return listFolderTree(data.accessToken);
}

export async function createFolderAction(input: unknown) {
  const data = z
    .object({
      name: z.string().min(1).max(100),
      parentFolderId: z.string().uuid().nullish(),
      accessToken: token,
    })
    .parse(input);
  return createFolder(data.name, data.parentFolderId ?? null, data.accessToken);
}

export async function renameFolderAction(input: unknown) {
  const data = z
    .object({ id: z.string().uuid(), name: z.string().min(1).max(100), accessToken: token })
    .parse(input);
  return renameFolder(data.id, data.name, data.accessToken);
}

export async function deleteFolderAction(input: unknown) {
  const data = z
    .object({
      id: z.string().uuid(),
      mode: z.enum(["move-to-root", "delete-files"]),
      accessToken: token,
    })
    .parse(input);
  return deleteFolder(data.id, data.mode, data.accessToken);
}

export async function moveFileAction(input: unknown) {
  const data = z
    .object({ id: z.string().uuid(), folderId: z.string().uuid().nullable(), accessToken: token })
    .parse(input);
  return moveFile(data.id, data.folderId, data.accessToken);
}

export async function moveFilesAction(input: unknown) {
  const data = z
    .object({
      ids: z.array(z.string().uuid()).min(1),
      folderId: z.string().uuid().nullable(),
      accessToken: token,
    })
    .parse(input);
  return moveFiles(data.ids, data.folderId, data.accessToken);
}

export async function moveFolderAction(input: unknown) {
  const data = z
    .object({ id: z.string().uuid(), folderId: z.string().uuid().nullable(), accessToken: token })
    .parse(input);
  return moveFolder(data.id, data.folderId, data.accessToken);
}

export async function setPermanentStatusAction(input: unknown) {
  const data = z
    .object({
      id: z.string().uuid(),
      isPermanent: z.boolean(),
      expiryHours: z.number().int().nullable(),
      accessToken: token,
    })
    .parse(input);
  return setPermanentStatus(data.id, data.isPermanent, data.expiryHours, data.accessToken);
}

export async function setDevPlanAction(input: unknown) {
  const data = z.object({ plan: z.enum(["free", "pro"]), accessToken: token }).parse(input);
  return setDevPlan(data.plan, data.accessToken);
}

export async function listStorageNodesAction(input: unknown) {
  const data = z.object({ accessToken: token }).parse(input);
  return listStorageNodesForOwner(data.accessToken);
}

export async function connectR2StorageNodeAction(input: unknown) {
  const data = z
    .object({
      displayName: z.string().min(1).max(100),
      bucket: z.string().min(1).max(100),
      region: z.string().max(100).nullish(),
      publicBaseUrl: z.string().url().nullish(),
      accountId: z.string().min(1).max(200),
      accessKeyId: z.string().min(1).max(200),
      secretAccessKey: z.string().min(1).max(200),
      accessToken: token,
    })
    .parse(input);
  return connectR2StorageNode(data);
}

export async function testStorageNodeConnectionAction(input: unknown) {
  const data = z.object({ id: z.string().uuid(), accessToken: token }).parse(input);
  return testStorageNodeConnection(data.id, data.accessToken);
}

export async function disconnectStorageNodeAction(input: unknown) {
  const data = z.object({ id: z.string().uuid(), accessToken: token }).parse(input);
  return disconnectStorageNode(data.id, data.accessToken);
}

export async function updateStorageNodeQuotaAction(input: unknown) {
  const data = z
    .object({ id: z.string().uuid(), quotaBytes: z.number().positive(), accessToken: token })
    .parse(input);
  return updateStorageNodeQuota(data.id, data.quotaBytes, data.accessToken);
}

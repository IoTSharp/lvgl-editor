import type { OutputBundle, OutputIssue } from '../output';

export function describeOutputError(error: unknown): string {
  const issues = (error as { issues?: OutputIssue[] } | null)?.issues;
  if (issues?.length) return issues.map(issue => {
    const location = [issue.componentId, issue.eventId, issue.nodeId].filter(Boolean).join(' / ');
    return `${issue.code}${location ? ` (${location})` : ''}: ${issue.message}`;
  }).join('\n');
  return error instanceof Error ? error.message : String(error);
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  try {
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
  } finally {
    a.remove();
    URL.revokeObjectURL(url);
  }
}

export async function downloadOutputZip(bundle: OutputBundle, name: string): Promise<void> {
  if (bundle.issues.length) throw new Error(bundle.issues.map(issue => issue.message).join('\n'));
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const [path, content] of Object.entries(bundle.files)) zip.file(path, content);
  downloadBlob(await zip.generateAsync({ type: 'blob' }), name);
}

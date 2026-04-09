import {
  generateMeetingProductivityInsights,
  type MeetingProductivityInsights,
} from '@/services/ai.service';
import { getMeetingById } from './meeting.service';

const NOTION_API_URL = 'https://api.notion.com/v1/pages';
const NOTION_VERSION = '2022-06-28';

export async function pushMeetingProductivityToNotion(meetingId: string) {
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!notionApiKey || !notionDatabaseId) {
    return {
      success: false as const,
      error: 'Notion is not configured. Set NOTION_API_KEY and NOTION_DATABASE_ID.',
    };
  }

  const meeting = await getMeetingById(meetingId);

  if (!meeting) {
    return {
      success: false as const,
      error: 'Meeting not found.',
    };
  }

  const productivity = await generateMeetingProductivityInsights({
    transcript: meeting.transcript,
    summary: meeting.summary,
  });

  if (!productivity.success) {
    return {
      success: false as const,
      error: 'error' in productivity ? productivity.error : 'Failed to generate meeting productivity insights.',
    };
  }

  const response = await fetch(NOTION_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: {
        database_id: notionDatabaseId,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: meeting.name,
              },
            },
          ],
        },
        Status: {
          rich_text: [
            {
              text: {
                content: meeting.status,
              },
            },
          ],
        },
        Date: {
          date: {
            start: new Date(meeting.startTime).toISOString(),
          },
        },
      },
      children: buildMeetingBlocks({
        meeting,
        productivity: productivity.insights,
      }),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    url?: string;
    message?: string;
  };

  if (!response.ok) {
    return {
      success: false as const,
      error: data.message || 'Failed to push meeting productivity to Notion.',
    };
  }

  return {
    success: true as const,
    pageId: data.id,
    url: data.url,
  };
}

function buildMeetingBlocks(input: {
  meeting: Awaited<ReturnType<typeof getMeetingById>>;
  productivity: MeetingProductivityInsights;
}) {
  const meeting = input.meeting;
  const productivity = input.productivity;

  if (!meeting) {
    return [];
  }

  const blocks = [
    paragraph(`Meeting date: ${new Date(meeting.startTime).toLocaleString()}`),
    paragraph(`Summary: ${meeting.summary || 'No summary available.'}`),
    heading('Overview'),
    paragraph(productivity.overview),
    heading('Decisions'),
    ...toBullets(productivity.decisions, 'No decisions detected.'),
    heading('Action Items'),
    ...toBullets(
      productivity.actionItems.map(
        (item) => `${item.task} | Owner: ${item.owner} | Deadline: ${item.deadline}`
      ),
      'No action items detected.'
    ),
    heading('Follow Ups'),
    ...toBullets(productivity.followUps, 'No follow-up suggestions detected.'),
    heading('Follow-up Draft'),
    paragraph(productivity.followUpDraft),
  ];

  if (meeting.transcript?.trim()) {
    blocks.push(heading('Transcript'));
    blocks.push(paragraph(trimForNotion(meeting.transcript, 1800)));
  }

  return blocks;
}

function heading(content: string) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [richText(content)],
    },
  };
}

function paragraph(content: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [richText(trimForNotion(content, 1800))],
    },
  };
}

function bullet(content: string) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [richText(trimForNotion(content, 1800))],
    },
  };
}

function richText(content: string) {
  return {
    type: 'text',
    text: {
      content,
    },
  };
}

function toBullets(items: string[], emptyFallback: string) {
  if (items.length === 0) {
    return [bullet(emptyFallback)];
  }

  return items.map((item) => bullet(item));
}

function trimForNotion(content: string, maxLength: number) {
  return content.length > maxLength ? `${content.slice(0, maxLength - 1)}…` : content;
}

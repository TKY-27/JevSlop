import Workspace from './workspace';
export const dynamic = 'force-dynamic';
export default function Page() { return <Workspace keyConfigured={Boolean(process.env.TYPESAFE_API_KEY?.trim())} />; }

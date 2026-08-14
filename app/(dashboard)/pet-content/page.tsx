import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { PetContentWorkspace } from "./pet-content-workspace";

export default async function PetContentPage(){ const user=await requireUser(); return <><Topbar title="宠物耗材小红书智能体" userName={user.name}/><PetContentWorkspace/></>; }

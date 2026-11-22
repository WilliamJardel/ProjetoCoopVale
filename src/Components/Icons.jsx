import {
  House,
  FileText,
  HandCoins,
  Receipt,
  ChartColumnIncreasing,
  Package,
  Truck,
  Bell,
  Settings,
  Building2,
  UserRound,
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  Download,
  Upload,
  Save,
  X,
  Check,
  Filter,
} from "lucide-react";

export const menuIcons = {
  dashboard: House,
  contratos: FileText,
  financeiro: HandCoins,
  "notas-fiscais": Receipt,
  relatorios: ChartColumnIncreasing,
  produtos: Package,
  entregas: Truck,
  instituicoes: Building2,
  perfil: UserRound,
  avisos: Bell,
  configuracoes: Settings,
};

export function MenuIcon({ name }) {
  const Icon = menuIcons[name];
  return Icon ? <Icon size={19} strokeWidth={1.8} aria-hidden="true" /> : null;
}

export const actionIcons = {
  adicionar: Plus,
  editar: Pencil,
  excluir: Trash2,
  buscar: Search,
  visualizar: Eye,
  baixar: Download,
  enviar: Upload,
  salvar: Save,
  fechar: X,
  confirmar: Check,
  filtrar: Filter,
};

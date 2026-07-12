import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptFriendRequest,
  declineOrCancelRequest,
  listFriendRequests,
  listFriends,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type RelationshipStatus,
} from "../lib/friends";

const RELATIONSHIP_LABELS: Record<RelationshipStatus, string> = {
  none: "",
  friends: "Amigos",
  pending_outgoing: "Pedido enviado",
  pending_incoming: "Te chamou",
};

export function FriendsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: ["friends-search", activeSearch],
    queryFn: () => searchUsers(activeSearch),
    enabled: activeSearch.trim().length >= 2,
  });

  const incomingQuery = useQuery({
    queryKey: ["friend-requests", "incoming"],
    queryFn: () => listFriendRequests("incoming"),
  });

  const outgoingQuery = useQuery({
    queryKey: ["friend-requests", "outgoing"],
    queryFn: () => listFriendRequests("outgoing"),
  });

  const friendsQuery = useQuery({
    queryKey: ["friends-list"],
    queryFn: () => listFriends(),
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["friends-search"] });
    queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    queryClient.invalidateQueries({ queryKey: ["friends-list"] });
  }

  const sendMutation = useMutation({
    mutationFn: (username: string) => sendFriendRequest(username),
    onSuccess: () => {
      setFeedback(null);
      invalidateAll();
    },
    onError: (err: any) => {
      setFeedback(err?.response?.data?.detail ?? "Não foi possível enviar o pedido.");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptFriendRequest(id),
    onSuccess: invalidateAll,
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => declineOrCancelRequest(id),
    onSuccess: invalidateAll,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFriend(id),
    onSuccess: invalidateAll,
  });

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  }

  const incoming = incomingQuery.data ?? [];
  const outgoing = outgoingQuery.data ?? [];
  const friends = friendsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">Amigos</h1>
        <Link to="/" className="text-sm text-purple-400 hover:underline">← Descobrir</Link>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-8">
        <section>
          <h2 className="text-sm font-medium text-neutral-400 mb-2">Buscar por username</h2>
          <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="username do seu amigo..."
              className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
            />
            <button type="submit" className="rounded-md bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium">
              Buscar
            </button>
          </form>

          {feedback && <p className="text-sm text-red-400 mb-2">{feedback}</p>}

          {searchQuery.isFetching && <p className="text-sm text-neutral-500">Buscando...</p>}
          {searchQuery.isError && (
            <p className="text-sm text-red-400">
              Não foi possível buscar agora. Tenta de novo em alguns segundos.
            </p>
          )}
          {searchQuery.data && searchQuery.data.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum usuário encontrado.</p>
          )}
          <ul className="flex flex-col gap-2">
            {searchQuery.data?.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-md border border-neutral-800 px-3 py-2">
                <span className="text-sm">{u.username}</span>
                {u.relationship_status === "none" ? (
                  <button
                    onClick={() => sendMutation.mutate(u.username)}
                    disabled={sendMutation.isPending}
                    className="rounded-md bg-purple-600 hover:bg-purple-500 px-3 py-1 text-xs font-medium"
                  >
                    Adicionar
                  </button>
                ) : (
                  <span className="text-xs text-neutral-500">{RELATIONSHIP_LABELS[u.relationship_status]}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-neutral-400 mb-2">Pedidos recebidos</h2>
          {incoming.length === 0 && <p className="text-sm text-neutral-500">Nenhum pedido pendente.</p>}
          <ul className="flex flex-col gap-2">
            {incoming.map((req) => (
              <li key={req.id} className="flex items-center justify-between rounded-md border border-neutral-800 px-3 py-2">
                <span className="text-sm">{req.requester.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptMutation.mutate(req.id)}
                    disabled={acceptMutation.isPending}
                    className="rounded-md bg-purple-600 hover:bg-purple-500 px-3 py-1 text-xs font-medium"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => declineMutation.mutate(req.id)}
                    disabled={declineMutation.isPending}
                    className="rounded-md border border-neutral-700 hover:border-red-500 hover:text-red-400 px-3 py-1 text-xs"
                  >
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-neutral-400 mb-2">Pedidos enviados</h2>
          {outgoing.length === 0 && <p className="text-sm text-neutral-500">Nenhum pedido enviado.</p>}
          <ul className="flex flex-col gap-2">
            {outgoing.map((req) => (
              <li key={req.id} className="flex items-center justify-between rounded-md border border-neutral-800 px-3 py-2">
                <span className="text-sm">{req.addressee.username}</span>
                <button
                  onClick={() => declineMutation.mutate(req.id)}
                  disabled={declineMutation.isPending}
                  className="rounded-md border border-neutral-700 hover:border-red-500 hover:text-red-400 px-3 py-1 text-xs"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-neutral-400 mb-2">Meus amigos</h2>
          {friends.length === 0 && <p className="text-sm text-neutral-500">Você ainda não tem amigos adicionados.</p>}
          <ul className="flex flex-col gap-2">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-md border border-neutral-800 px-3 py-2">
                <span className="text-sm">{f.username}</span>
                <div className="flex gap-2">
                  <Link
                    to={`/amigos/${f.id}/comparar`}
                    className="rounded-md border border-neutral-700 hover:border-purple-500 hover:text-purple-400 px-3 py-1 text-xs"
                  >
                    Comparar
                  </Link>
                  <button
                    onClick={() => removeMutation.mutate(f.id)}
                    disabled={removeMutation.isPending}
                    className="rounded-md border border-neutral-700 hover:border-red-500 hover:text-red-400 px-3 py-1 text-xs"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

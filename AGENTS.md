<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep additive Betje group/payment/reminder logic in a browser-safe module and supplemental UI separate from the existing bet flow, so legacy bet records and the existing local storage key remain compatible.
- Group imports are explicitly simulated and payments are user-supplied Tikkie links with manual settlement; no delivery or automatic payment confirmation may be implied without a verified service integration.
- Undated legacy bets retain their data without invented timestamps; overdue status uses creation time for unresolved bets and result time for unpaid stakes.

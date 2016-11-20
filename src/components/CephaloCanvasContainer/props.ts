export interface StateProps {
  hasImage: boolean;
  isLoading: boolean;
  shouldShowLens: boolean;
  hasError: boolean;
  errorMessage: string | null;
};

export interface DispatchProps {
  onResize(rect: { top: number, left: number, width: number, height: number }): any;
  onRequestDismissError(): any;
};

export type ConnectableProps = StateProps & DispatchProps;

export interface OwnProps {
  className?: string;
};

export type Props = ConnectableProps & OwnProps;

export default Props;
